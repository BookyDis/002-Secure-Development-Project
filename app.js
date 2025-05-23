const express = require("express");
const path = require("path");
//csrf library because the server is managed with session so csrf-sync is used
const { csrfSync } = require("csrf-sync");
// xss library
const xss = require("xss");
//MFA Libraries
const speakeasy = require('speakeasy');//2FA Google Auth
const qrcode = require('qrcode'); //QR Generation For Google Auth
const rateLimit = require('express-rate-limit'); //Express Rate Limit to limit repeated requests
const session = require('express-session');
const crypto = require('crypto'); // Used to generate random sessionID
//Encryption/Hashing
const bcrypt = require('bcrypt');

//Post Gres SQL
const { Pool } = require('pg');

const db = new Pool({
    user: 'DSS', // DB username
    host: 'localhost',
    database: 'dss_db', //  DB name created
    password: 'DSSUG06', // PostgreSQL password
    port: 5432,
});
//Request Limiter
const loginLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: { message: 'Too many login attempts. Please try again later.' }
});


async function getUser(username) {
    const res = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    return res.rows[0];
}

async function createUser(username, password, mfaSecret) {
    const passwordHash = await bcrypt.hash(password, 10);
    await db.query(
        'INSERT INTO users (username, password, mfa_secret) VALUES ($1, $2, $3)',
        [username, passwordHash, mfaSecret]
    );
}

async function verifyUserMFA(username) {
    await db.query('UPDATE users SET mfa_verified = true WHERE username = $1', [username]);
}



//app intialisation
const app = express();

//MFA Middleware
app.use(session({
    genid: () => crypto.randomUUID(), // generates random sessionID
    secret: 'a9f!j3n@1#kd92L!q7zX^vpX0swqz8F6',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true, // client side cannot access the cookie
        secure: false, // true if using https
        sameSite: 'lax',
        maxAge: 1000 * 60 * 30 // 30 minute session timer
    }
}));

//extracting fucntions from csrf-sync
const {
    invalidCsrfTokenError, // function to handle invalid CSRF token errors
    generateToken, // this function is used to generate a csrf token
    csrfSynchronisedProtection, // the default CSRF protection middleware.
  } = csrfSync();


app.use((req, res, next) => {
    if (!req.session.user) {
        // If no user is found in the session, the session has expired
        console.log('Session expired or user not logged in');
    } else {
        // If session is still active
        console.log(`Session is active. User: ${req.session.user}`);
    }
    next(); // Continue to the next middleware or route
});

app.use(express.static('public'));
//middleware for parsing JSON bodies as per csrf-csrf requirement
app.use(express.json());
//for form data
app.use(express.urlencoded({ extended: true })); 
//load view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

//endpoint to generate and send csrf token
app.get("/csrf-token", (req, res) => {
    const token = generateToken(req); // generate CSRF token
    res.json({ csrfToken: token }); // send the token to the client
});

//delcare that every request that isn't GET , OPTIONS or HEAD will be protected by csrf
app.use(csrfSynchronisedProtection); 

//home route
app.get("/", async function (req, res) {
    try {
        // Fetch the 3 most recent posts
        const result = await db.query(
            'SELECT * FROM posts ORDER BY created_at DESC LIMIT 3'
        );

        res.render("index", {
            title: "Home",
            recentPosts: result.rows || [] // Pass the posts to the view
        });
    } catch (error) {
        console.error("Error fetching recent posts:", error);
        res.status(500).send("Error loading home page");
    }
});

app.get('/moviesPage', function (req, res) {
    res.render('moviesPage', {
        title: 'Movies'
    })
})

app.get('/login', function (req, res) {
    if (req.session.user) {
        // If the user is logged in, redirect to the dashboard
        res.redirect('/dashboard');
    } else {
        
        // If not logged in, render the login page
        res.render('login', { title: 'Login'});  // Render login page
    }
});

app.get('/signup', function (req, res) {
    res.render('signup', {
        title: 'Sign Up'
    });
});

app.get('/dashboard', async (req, res) => {
    if (!req.session.user) {
        // If no user is found, redirect to login
        return res.redirect('/login');
    }
    // If session is active, proceed to dashboard
    try {
        // Fetch only posts created by the logged-in user
        const result = await db.query(
            'SELECT * FROM posts WHERE author = $1 ORDER BY created_at DESC',
            [req.session.user]
        );

        // Render the dashboard with user posts
        res.render('dashboard', {
            user: req.session.user,
            posts: result.rows,
        });
    } catch (error) {
        console.error('Error loading user posts:', error);
        res.status(500).send('Server error loading dashboard');
    }
});

//start server
app.listen(3000, function () {
    console.log("Server started on port 3000");
})

//MFA Signup
app.post('/signup',  async (req, res) => {
    const { username, password } = req.body;

    //Sanitize user's input to prevent XSS attacks
    const sanitizedUsername = xss(username); 
    const sanitizedPassword = xss(password); 

    const existing = await getUser(sanitizedUsername);
    if (existing) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const secret = speakeasy.generateSecret({ name: `MyApp (${sanitizedUsername})` });
    await createUser(sanitizedUsername, sanitizedPassword, secret.base32);

    qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
        if (err) return res.status(500).send('QR code error');
        res.json({ qrCode: data_url });
    });
});


//MFA Verify Signup
app.post('/verify-signup', async (req, res) => {
    const { username, token } = req.body;
    const user = await getUser(username);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const verified = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token
    });

    if (verified) {
        await verifyUserMFA(username);
        return res.json({ message: 'Signup complete' });
    } else {
        return res.status(400).json({ message: 'Invalid token' });
    }
});


//Verify Login for USERNAME + PASSWORD
app.post('/login-step-1', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    const user = await getUser(username);

    await new Promise(resolve => setTimeout(resolve, 1000)); //Delay to prevent timing attacks

    //Sanitize user's input to prevent XSS attacks
    const sanitizedUsername = xss(username); 
    const sanitizedPassword = xss(password); 
    
    if (!user || !user.mfa_verified) {
        return res.status(401).json({ message: 'Invalid username or password' }); //Generic User Message
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
        return res.status(401).json({ message: 'Invalid username or password' }); //Generic User Message
    }

    req.session.pendingUser = sanitizedUsername;
    res.json({ message: 'Password valid. Proceed with MFA.' });
});

//Verify Login for MFA Token
app.post('/verify-mfa', async (req, res) => {
    const { token } = req.body;
    const username = req.session.pendingUser;
    const user = await getUser(username);
    
    
    if (!user || !user.mfa_secret) {
        return res.status(400).json({ message: 'Invalid session or user' });
    }

    const verified = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token
    });

    if (!verified) {
        return res.status(401).json({ message: 'Invalid MFA token' });
    }

    // Regenerates session preventing session fixation attacks
    req.session.regenerate((err) => {
        if (err) {
            return res.status(500).json({ message: 'Error regenerating session' });
        }

        req.session.user = username;
        res.json({ message: 'Login successful with MFA' });
    });
    delete req.session.pendingUser;
});

app.post('/posts', async (req, res) => {
    const { title, content } = req.body;
    if (!req.session.user) {
        return res.status(401).send('Unauthorized');
    }

    
    console.log('New post:', title, content); //Debug log
    //Sanitize user's input to prevent XSS attacks
    const sanitizedTitle = xss(title);
    const sanitizedContent = xss(content); 

    try {
        await db.query(
            'INSERT INTO posts (title, content, author) VALUES ($1, $2, $3)',
            [sanitizedTitle, sanitizedContent, req.session.user]
        );
        res.status(200).json({ message: 'Post created' });
    } catch (error) {
        console.error('Error inserting post:', error);
        res.status(500).send('Server error');
    }
});

app.get('/postsPage', async (req, res) => {
    const search = req.query.search; //gets search term from the search bar

    let query = 'SELECT * FROM posts'; // base sql
    let params = [];

   //Sanitize user's input to prevent XSS attacks
    const sanitizedSearch = xss(search);
    // if there is a search term, add a where clause, this is what is actually filtering
    if (sanitizedSearch) {
        query += ' WHERE title ILIKE $1 OR content ILIKE $1'; //ILIKE is case insensitive
        params.push(`%${search}%`); // can match partial strings
    }

    // parameterized queries with placeholders ($1), and passing values separately by 'params' array, prtects against SQL injection
    query += ' ORDER BY created_at DESC'; // new posts first

    try {
        const result = await db.query(query, params);
        res.render('postsPage', {
            title: 'Posts',
            posts: result.rows, // matching posts
            user: req.session.user,
            csrfToken: generateToken(req), // csrf protection
            search
        });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).send('Error loading posts');
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Server error');
        }
        // destroy the session cookie
        res.clearCookie('connect.sid');
        // redirect user back to home page 
        res.redirect('/'); // 
    });
});


app.post('/deletePost', async (req, res) => { 
    const postId = req.body.postId;

    if (!req.session.user) {
        return res.status(401).send('Unauthorized');
    }

    try {
        // Delete the post where the postId matches and the author is the logged-in user
        const result = await db.query(
            'DELETE FROM posts WHERE id = $1 AND author = $2',
            [postId, req.session.user]
        );

        if (result.rowCount === 0) {
            return res.status(404).send('Post not found or you do not have permission to delete it');
        }

        res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).send('Server error');
    }
});
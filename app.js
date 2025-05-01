const express = require("express");
const path = require("path");
//csrf-csrf library requirement
const cookieParser = require('cookie-parser');
const { doubleCsrf } = require('csrf-csrf'); //Fixed Correct import from csrf to double csrf
//MFA Libraries
const speakeasy = require('speakeasy');//2FA Google Auth
const qrcode = require('qrcode'); //QR Generation For Google Auth
const rateLimit = require('express-rate-limit'); //Express Rate Limit to limit repeated requests
const session = require('express-session');
const crypto = require('crypto'); // Used to generate random sessionID



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

//Encryption/Hashing
const bcrypt = require('bcrypt');

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
        maxAge: 1000 * 60 * 30 // 30 session timer
    }
}));

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
//cookie parser
app.use(cookieParser());
//middleware for parsing JSON bodies as per csrf-csrf requirement
app.use(express.json());

//load view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

//home route
app.get("/", function (req, res) {
    res.render("index", {
        title: "Home"
    });
});

//adding other routes
app.get('/postsPage', function (req, res) {
    const csrfToken = generateCsrfToken(req, res);
  // You could also pass the token into the context of a HTML response.
    res.json({ csrfToken });
    
    res.render('postsPage', {
        title: 'Posts'
    })
})

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
        res.render('login', { title: 'Login' });  // Render login page
    }
});

app.get('/signup', function (req, res) {
    res.render('signup', {
        title: 'Sign Up'
    });
});

app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        // If no user is found, redirect to login
        return res.redirect('/login');
    }

    // If session is active, proceed to dashboard
    res.render('dashboard', { user: req.session.user });
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Could not log out. Please try again.');
        }
        res.redirect('/login');  // Redirect to login page after logout
    });
});

//start server
app.listen(3000, function () {
    console.log("Server started on port 3000");
})

//function to create csrf
const doubleCsrfUtilities = doubleCsrf({
    getSecret: () => "Secret", // A function that optionally takes the request and returns a secret
    getSessionIdentifier: (req) => "", // A function that should return the session identifier for a given request
    cookieName: "__Host-psifi.x-csrf-token", // The name of the cookie to be used, recommend using Host prefix.
    cookieOptions: {
        sameSite: "lax",  // Recommend you make this strict if posible
        path: "/",
        secure: true
    },
    size: 64, // The size of the generated tokens in bits
    ignoredMethods: ["GET", "HEAD", "OPTIONS"], // A list of request methods that will not be protected.
    getTokenFromRequest: (req) => req.headers["x-csrf-token"], // A function that returns the token from the request
});
//MFA Signup
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    const existing = await getUser(username);
    if (existing) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const secret = speakeasy.generateSecret({ name: `MyApp (${username})` });
    await createUser(username, password, secret.base32);

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

    if (!user || !user.mfa_verified) {
        return res.status(401).json({ message: 'Invalid username or password' }); //Generic User Message
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
        return res.status(401).json({ message: 'Invalid username or password' }); //Generic User Message
    }

    req.session.pendingUser = username;
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


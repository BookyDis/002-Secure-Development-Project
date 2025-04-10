const express = require("express");
const path = require("path");
//csrf-csrf library requirement
const cookieParser = require('cookie-parser');
const csrf = require('csrf-csrf');

//app intialisation
const app = express();

app.use(express.static('public'));
//cookie parser
app.use(cookieParser());
//middleware for parsing JSON bodies as per csrf-csrf requirement
app.use(express.json());

//load view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

//home route
app.get("/", function(req, res){
    res.render("index", {
        title: "Home"
    });
});

//adding other routes
app.get('/postsPage', function(req, res){
    res.render('postsPage', {
        title:'Posts'
    })
})

//start server
app.listen(3000, function(){
    console.log("Server started on port 3000");
})

//function to create csrf
const doubleCsrfUtilities = doubleCsrf({
  getSecret: () => "Secret", // A function that optionally takes the request and returns a secret
  getSessionIdentifier: (req) => "", // A function that should return the session identifier for a given request
  cookieName: "__Host-psifi.x-csrf-token", // The name of the cookie to be used, recommend using Host prefix.
  cookieOptions: {
    sameSite : "lax",  // Recommend you make this strict if posible
    path : "/",
    secure : true,
    ...remainingCookieOptions // See cookieOptions below
  },
  size: 64, // The size of the generated tokens in bits
  ignoredMethods: ["GET", "HEAD", "OPTIONS"], // A list of request methods that will not be protected.
  getTokenFromRequest: (req) => req.headers["x-csrf-token"], // A function that returns the token from the request
});


const express = require("express");
const path = require("path");

//app intialisation
const app = express();

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
app.get('/aboutUs', function(req, res){
    res.render('aboutUs', {
        title:'About Us'
    })
})

//start server
app.listen(3000, function(){
    console.log("Server started on port 3000");
})
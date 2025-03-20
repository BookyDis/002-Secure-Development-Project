const express = require("express");
const path = require("path");

//app intialisation
const app = express();

app.use(express.static('public'));

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
        title:'Posts Page'
    })
})

//start server
app.listen(3000, function(){
    console.log("Server started on port 3000");
})
//jshint esversion:6

require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");

// const bcrypt = require("bcrypt");
// const saltRounds = 10;

const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');






const app = express();

// console.log(md5("123456"));
// console.log("Strog passwrod hash" + md5("s10jfnonr3nononoafboafjoonnfnosnfos"));

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
     extended: true
}));



app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));


app.use(passport.initialize()); //use initalize package
app.use(passport.session());


// mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});
// mongoose.connect("mongodb://0.0.0.0:27017/userDB", {useNewUrlParser: true});
mongoose.connect("mongodb://127.0.0.1:27017/userDB", {useNewUrlParser: true});
// mongoose.set("useCreateIndex", true);  / with this no warning


const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);



// const secret = "Thisisourlittlesecret.";
// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });
// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] });
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, done) {
    done(null, user.id);
});
  
// passport.deserializeUser(function(id, done) {
//     User.findById(id, function(err, user) {
//       done(err, user);
//     });
// });
passport.deserializeUser(function(id, done) {
    User.findById(id)
      .then(user => {
        done(null, user);
      })
      .catch(err => {
        done(err, null);
      });
  });


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



app.get("/", function(req, res){
    res.render("home");
});
 
app.get("/auth/google",
//use passport to authenticate using google stratagey, we wnt user profie its id and email
  passport.authenticate('google', { scope: ["profile"] })
);


app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");

});


app.get("/login", function(req, res){
    res.render("login");
});
 
app.get("/register", function(req, res){
    res.render("register");
});



// app.get("/secrets", function(req, res){
//    if (req.isAuthenticated()) {
//     res.render("secrets");
//    } else {
//     res.redirect("/login");
//    }
// });
// app.get("/secrets", function(req, res){
//     //ne==> not equal
//     User.find({"secret": {$ne: null}}, function(err, foundUsers){
//       if (err){
//         console.log(err);
//       } else {
//         if (foundUsers) {
//           res.render("secrets", {usersWithSecrets: foundUsers});
//         }
//       }
//     });
// });
app.get("/secrets", function(req, res){
    // Find users with non-null secret values using a Promise
    User.find({"secret": {$ne: null}})
      .then(foundUsers => {
        if (foundUsers) {
          res.render("secrets", {usersWithSecrets: foundUsers});
        }
      })
      .catch(err => {
        console.log(err);
      });
});






app.get("/submit", function(req, res){
    if (req.isAuthenticated()){
      res.render("submit");
    } else {
      res.redirect("/login");
    }
});
  
// app.post("/submit", function(req, res){
//     const submittedSecret = req.body.secret;
  
//   //Once the user is authenticated and their session gets saved, their user details are saved to req.user.
//     // console.log(req.user.id);
  
//     //user model
//     User.findById(req.user.id, function(err, foundUser){
//       if (err) {
//         console.log(err);
//       } else {
//         if (foundUser) {
//           foundUser.secret = submittedSecret;
//           foundUser.save(function(){
//             res.redirect("/secrets");
//           });
//         }
//       }
//     });
// });
app.post("/submit", function(req, res){
    const submittedSecret = req.body.secret;
  
    // Find the user by their ID using a Promise
    User.findById(req.user.id)
      .then(foundUser => {
        if (foundUser) {
          foundUser.secret = submittedSecret;
          return foundUser.save();
        }
      })
      .then(() => {
        res.redirect("/secrets");
      })
      .catch(err => {
        console.log(err);
      });
  });
  







// app.get("/logout", function(req, res){
//     req.logout();
//     res.redirect("/");
// });

app.get('/logout', function(req, res){
    req.logout(function(err) {
      if (err) {
        console.log(err);
      }
      res.redirect('/');
    });
  });




// app.post("/register", function(req, res) {
//     const newUser = new User({
//         email: req.body.username,
//         password: req.body.password
//     });
    

//     newUser.save(function(err){
//         if(err) {
//             console.log(err);
//         } else {
//             //if user is registered then only rendering the secret page
//             res.render("Secrets");
//         }
//     });
// });

app.post("/register", function(req, res) {

    User.register({username: req.body.username}, req.body.password, function(err, user){
        if (err) {
          console.log(err);
          res.redirect("/register");
        } else {
            //new registered user ||    type of authentication is local
          passport.authenticate("local")(req, res, function(){  //this callback is only triggred if auhentication was successful
            res.redirect("/secrets");
          });
        }
      });

});

// app.post("/login", function(req, res){
//     const username = req.body.username;
//     const password = req.body.password;

//     //look in the user collection
//     //model.findone
//     User.findOne({email: username}, function(err, foundUser){
//         if(err) {
//             console.log(err);
//         } else {
//             if(foundUser) {
//                 if(foundUser.password === password) {
//                     res.render("Secrets");
//                 }
//             }
//         }
//     });
// });

app.post("/login", function(req, res){
  
    const user = new User({
        username: req.body.username,
        password: req.body.password
      });
    
      //method is of passport
      req.login(user, function(err){
        if (err) {
          console.log(err);
        } else {
          passport.authenticate("local")(req, res, function(){
            res.redirect("/secrets");
          });
        }
      });

});







app.listen(3000, function() {
     console.log("Server started on port 3000.");
});
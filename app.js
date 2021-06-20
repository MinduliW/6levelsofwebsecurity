//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const findOrCreate = require('mongoose-find-or-create')
//const encrypt = require("mongoose-encryption");
//const md5 = require('md5');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;

const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
  secret : "Our little secret.",
  resave : false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser:true});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  email : String,
  password : String,
  googleId : String,
  secret : String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
//const secret = process.env.SECRET;
//userSchema.plugin(encrypt, { secret: secret ,encryptedFields: ['password'] });


const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID:     process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));


app.get("/", function(req,res){
  res.render("home")
});

app.get("/auth/google", passport.authenticate("google", {scope:["profile"] })
)

app.get( '/auth/google/secrets',
    passport.authenticate( 'google', {failureRedirect: '/login'}),
    function(req,res){
      res.redirect('/secrets');
    });


app.get("/login", function(req,res){
  res.render("login")
});

app.get("/register", function(req,res){
  res.render("register")
});

app.get("/logout", function(req,res){
  req.logout();
  res.redirect("/")
});


app.get("/submit", function(req,res){
  if (req.isAuthenticated()){
      res.render("submit")
  }
  else {
    res.redirect("/login")
  }
})
app.get("/secrets", function(req,res){
 User.find({"secret" : {$ne :null}}, function(err, foundUsers){
   if(err) {console.log(err)}
   else{
     if(foundUsers){
       res.render("secrets", {usersWithSecrets : foundUsers})
     }
   }
 })


});

app.post("/submit", function(req,res){
  const submmitedSecret = req.body.secret;

  User.findById(req.user.id, function(err, foundUser){
    if (err){console.log(err)}
    else{
      if(foundUser){
        foundUser.secret = submmitedSecret;
        foundUser.save(function(){
          res.redirect("/secrets")
        })
      }
    }
  })

})

app.post("/register", function(req,res){
User.register({username: req.body.username}, req.body.password, function(err,user){
  if(err){
    console.log(err)
    res.redirect("/register");
  }
  else{
    passport.authenticate("local")(req,res, function(){
      res.redirect("/secrets")
    })
  }
})
//   bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//     // Store hash in your password DB.
//     const newUser = new User({
//       email:req.body.username,
//       password: hash
//     })
//
//     newUser.save(function(err){
//       if (err){
//         console.log(err);
//       }
//       else{
//         res.render("secrets")
//       }
//     });
// });
//


});

app.post("/login", function(req, res){

  const user = new User({
    username :  req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if(err){ console.log(err)}
    else{
      passport.authenticate("local")(req,res, function(){
        res.redirect("/secrets")
      })
    }
  })
//   const username = req.body.username;
//   const password = (req.body.password);
//
//
//   User.findOne({email:username}, function(err, foundUser){
//     if (err){
//       console.log(err);
//     }
//     else {
//       if (foundUser){
//         bcrypt.compare(password, foundUser.password, function(err, result) {
//     // result == true
//     if (result === true){
//         res.render("secrets")
//     }
// });
//
// }} });
});


app.listen(3000, function(){
  console.log("listening on port 3000")
})

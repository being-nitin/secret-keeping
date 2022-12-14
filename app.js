//jshint esversion:6
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyparser = require("body-parser");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
// const bcrypt = require("bcrypt");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");



const app = express();

app.set('view engine','ejs');

app.use(bodyparser.urlencoded({extended: true}));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());



mongoose.connect("mongodb+srv://"+process.env.Admin_cred+"@cluster0.mktajco.mongodb.net/userDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);



// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});


const User = new mongoose.model("User",userSchema);
passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
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

// const saltsround = 10;

app.get("/secrets",function(req,res){
    User.find({"secret": {$ne: null}}, function(err,foundUsers){
        if(err){
            console.log(err);
        }
        else{
            if(foundUsers){
                res.render("secrets", {usersWithSecrets: foundUsers});
            }
        }
    });
    
    
    
    
    /*
    if(req.isAuthenticated()){
        res.render("secrets");
    }
    else{
        res.redirect("/login")
    }
    */
});
app.get("/submit", function(req,res){
    if(req.isAuthenticated()){
        res.render("submit");
    }
    else{
        res.redirect("/login")
    }
})
app.post("/submit",function(req,res){
    const submittedSecret = req.body.secret;
    console.log(req.user);

    User.findById(req.user.id, function(err,foundUser){
        if(err){
            console.log(err);
        }
        else{
            if(foundUser){
                foundUser.secret = submittedSecret;
                foundUser.save(function(){
                    res.redirect("/secrets");
                })
            }
        }
    })

})

app.get("/logout",function(req,res){
    req.logOut;
    res.redirect("/");
})
app.post("/register",function(req,res){
   User.register({username: req.body.username}, req.body.password, function(err, user){
    if(err){
        console.log(err);
        res.redirect("/register");
    }
    else{
        passport.authenticate("local")(req,res,function() {
            res.redirect("/secrets");
        })
    }
   })
   
   
   
   
   
   
    /*
    bcrypt.hash(req.body.password, saltsround, function(err,hash){
        const newUser = new User({
            email: req.body.username,
            password: hash // converted into hash codes
            
         })
        // because we want the registered users to see the secrets.
            newUser.save(function(err){
            if(!err){
                res.render("secrets");
            }
            else{
                console.log(err);
            }
         })
         res.render("login");

    })
    */
    
})
 // it will check that login is done by authenticated user or not.

app.post("/login",function(req,res){
    const user = new User({
        username: req.body.username,
        passport: req.body.password
    });
    req.login(user, function(err){
        if(err){
            console.log(err);
        }
        else{
            passport.authenticate("local");
            res.redirect("/secrets");
        }
    })
    
    
    
    
    
    
    /*
    const username = req.body.username;
    const password = (req.body.password);
    User.findOne({email: username}, function(err,foundUser){
        if(err){
            console.log(err);
        }
        else{
            if(foundUser){
                // if(foundUser.password===password){
                          // }
           bcrypt.compare(password, foundUser.password, function(err,result){
                    if(result===true){
                        res.render("secrets");
                    }
                })
            }
        }
    });
    */
})


app.use(express.static("public"));

app.get("/",function(req,res){
    res.render("home");
})
app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] }));

  app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });



app.get("/login",function(req,res){
    res.render("login");
})
app.get("/register",function(req,res){
    res.render("register");
})

let port = process.env.PORT;
if(port==null || port==""){
  port=3000;
}

app.listen(port, function() {
  console.log("Server has started succesfully");
});
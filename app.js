require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(cookieParser());
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
};
mongoose.Promise = global.Promise;
////uncomment to use local db
// mongoose.connect("mongodb://localhost:27017/fitnessDB", options);
mongoose.connect("mongodb+srv://admin-enes:" + process.env.PASSWORD + "@cluster0.drsol.mongodb.net/fitnessDB", options);
mongoose.set("useCreateIndex", true);
mongoose.set('useFindAndModify', false);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("user", userSchema);

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
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res) {
  res.render("home", {
    success: req.flash('success'),
    fail: req.flash('error')
  });
});

app.get("/auth/google", passport.authenticate('google', {
  scope: ['profile']
}));

app.get("/auth/google/secrets",
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    req.flash('success', 'basarili bir sekilde google ile giris yaptiniz');
    res.redirect("/");
  });

app.get("/login", function(req, res) {
  res.render("login", {
    success: req.flash('success'),
    fail: req.flash('error')
  });
});

app.get("/register", function(req, res) {
  res.render("register", {
    success: req.flash('success'),
    fail: req.flash('error')
  });
});

app.post("/register", function(req, res) {

  if (req.body.password === req.body.secondPassword) {
    User.register({
      username: req.body.username
    }, req.body.password, function(err, user) {
      if (err) {
        console.log(err);
        req.flash('error', 'bu mail adresini kullanamazsiniz');
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function() {
          req.flash('success', 'basarili bir sekilde uye oldunuz');
          res.redirect("/");
        });
      }
    });
  } else {
    req.flash('error', 'paralolar ayni degil');
    res.redirect("/register");
  }



});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  successFlash: 'basarili bir sekilde giris yaptiniz.',
  failureRedirect: '/login',
  failureFlash: 'hatali kullanici adi ya da sifre'
}));





app.listen(3000, function() {
  console.log("listening on port 3000");
});

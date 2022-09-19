//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const date = require(__dirname + "/date.js");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret: "This is a secret",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://groupListDB:Password%231@cluster0.ln5qu6w.mongodb.net/groupListDB", {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify : true});
mongoose.set("useCreateIndex", true);

const today = date.getDate();

// authentication
const userSchema = new mongoose.Schema ({
  email: String,
  name: String,
  password: String,
});

userSchema.plugin(passportLocalMongoose);
//userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


// database setup for list info
const itemsSchema = {
  item  : String,
  entryBy : String
}

const Item = mongoose.model("Item", itemsSchema);

const listSchema = {
  name : String,
  code: String,
  createdBy : String,
  items : [itemsSchema]
}

const List = mongoose.model("List", listSchema);

//////////////// all api routes
// authentication routes
app.get("/", function(req, res){
  res.render("home");
});

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});


app.post("/logout", function(req, res){
  req.logout(function(err){
    if(err){
      console.log(err)
    } else {
      res.redirect("/");
    }
  });
});

app.post("/register", function(req, res){
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/lists");
      });
    }
  });

});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/lists");
      });
    }
  });

});


/// all listing routes
app.get("/lists", function(req,res){
  if(req.isAuthenticated) {
    List.find({}, function(err, ListBoard){
      if(!err){
        console.log(ListBoard)
        res.render("main", {activeLists : ListBoard});
      } else{
        console.log(err);
      }
    });
  } else {
    res.render("login");
  }
});

app.post("/newlist", function(req, res){
  if(req.isAuthenticated){
    const newList = req.body.listName ;
    const userName = req.user.username;
    const random = Math.floor(Math.random() * 234);
    const newCode = "FightList_"+ newList.substr(0,3) +"_"+random;

    const unCheck = new Item ({item : "<-- Click on this box to remove an item", entryBy : userName})
    const defaultItems = [unCheck];

    const dbItem = new List({
      name : newList,
      items: defaultItems,
      code: newCode,
      createdBy : userName
    });
    dbItem.save();

    res.redirect("/lists");
    
  } else {
    res.redirect("/login");
  }
});

app.post("/getList", function(req, res){
  const code = req.body.code;
  if(req.isAuthenticated) {
    res.redirect("/list/"+code);
  } else {
    res.redirect("/login")
  }

});

app.get("/list/:code", function(req,res){
  const listCode = req.params.code;

  console.log("#############in list###########")
  console.log(listCode);
  console.log("########################")

  if(req.isAuthenticated) {
    List.findOne({code : listCode}, function(err, list){
      if(list){
        console.log("#############in list###########")
        console.log(list);
        console.log("########################")

        res.render("list", {day: today, listTitle: list.name, gameCode : listCode, newListItems: list.items, createdBy : list.createdBy})
      } else{
        console.log(err);
        console.log("!Not available");
        res.redirect("/lists");
      }
    });
  } else {
    res.redirect("/login")
  }
});

app.post("/deleteItem", function(req, res){
  const ID = req.body.checkBox;
  const username = req.body.username;
  const listCode = req.body.code;

  List.updateMany({code : listCode}, { $pull : {items : {_id : ID }} }, function(err, foundBoard){
    if(foundBoard){
      res.redirect("/list/"+listCode);
    }else{
      console.log(err);
    }
  });
});

app.post("/addItem", function(req, res){
  console.log("#############in add Item print code ###########")
    console.log(req.body.code);
    console.log("########################")

  if(req.isAuthenticated){
    const itemName = req.body.newItem;
    const userName = req.user.username;
    const code = req.body.code;

    console.log("#############in add Item print username and code ###########")
    console.log(userName);
    console.log(code);
    console.log("########################")

    const dbItem = new Item ({
      item : itemName,
      entryBy : userName
    });

    List.findOne({code: code}, function(err, foundList){
      if(foundList){
        console.log("#############in add Item###########")
        console.log(foundList);
        console.log("########################")

        foundList.items.push(dbItem);
        foundList.save();
      }else{
        console.log(err);
      }
    });
    res.redirect("/list/"+code);
  } else {
    res.redirect("/login");
  }
});

app.listen(process.env.PORT  || 3000, function() {
  console.log("Server started on port 3000");
});

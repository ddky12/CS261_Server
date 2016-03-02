var MongoClient = require('mongodb').MongoClient;

//TODO load this from environment
var url = 'mongodb://localhost:27017/cs261';

var createTestAdmin = function(db, callback) {
  var collection = db.collection('users');
  
  collection.insert(
    {
      "username": "TestAdmin",
      "password": "PixarGoodGhibliBETTER",
      "isAdmin": true
    });
}

var singleton = null;
module.exports.connect = function(options, callback) {
  if(singleton) {
    console.log("using singleton db...");
    process.nextTick(function() {
      callback(null, singleton);
    });
  }
  else {
    console.log("creating db first time...")
    MongoClient.connect(url, function(err, db) {
      if(err) callback(err);
      singleton = db;
      db.collection('users').createIndex({username: true, password:false}, {unique: true}, function(err) {
        if(err) return callback(err);
        callback(null, db);
      });
      
      // db.collection('items').createIndex({shortname: true}, {unique: true}, function(err) {
      //   if(err) return callback(err);
      //   callback(null, db);
      // });
      
      createTestAdmin(db, function(){
        console.log("created admin account: TestAdmin");
      });
      
    });
  }
}

module.exports.close = function() {
  if(singleton) {
    singleton.close();
    singleton = null;
  }
}

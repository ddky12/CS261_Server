var MongoClient = require('mongodb').MongoClient;

//TODO load this from environment
var url = 'mongodb://localhost:27017/cs261';

var singleton = null;
module.exports.connect = function(options, callback) {
  if(singleton) {
    process.nextTick(function() {
      callback(null, singleton);
    });
  }
  else {
    MongoClient.connect(url, function(err, db) {
      if(err) callback(err);
      singleton = db;
      db.collection('users').createIndex({username: true, password:false}, {unique: true}, function(err) {
        if(err) return callback(err);
        callback(null, db);
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

var mongo = require('./db');

function getUser(req, res) {
  console.log("trying to get...");
	var id = req.body.id || req.query.id;

  mongo.connect({}, function(err, db){
    if(err) return next(err);

    var users = db.collection('users');

    var ObjectID = require('mongodb').ObjectID;
    
    var fResult = users.find({ _id: ObjectID(id)});
    fResult.toArray(function(err, docs){
      if(err) return next(err);

      var doc = docs[0];
      if(doc) { // found matching result
        var response = {
          id: doc._id,
          username: doc.username
        };

        res.send(JSON.stringify(response));
      }
    });
  });
}

function findUser(req, res, next) {
  console.log("trying to find...");
  var username = req.body.username || req.query.username;

  mongo.connect({}, function(err, db){
    if(err) return next(err);

    var users = db.collection('users');
    
    var fResult = users.find({ username: username});
    fResult.toArray(function(err, docs){
      if(err) return next(err);

      var doc = docs[0];
      if(doc) { // found matching result
        var response = {
          status: 'succes',
          data : {
            id: doc._id,
            username: doc.username
          }
        };

        res.send(JSON.stringify(response));
      }
    });
  });
}

function createUser(req, res, next) {
  console.log("trying to create...");
  var username = req.body.username || req.query.username;
  var password = req.body.password || req.query.password;

  mongo.connect({}, function(err, db){
    if(err) return next(err);
    console.log("1111 ---- trying to create... " + username);
    
    var users = db.collection('users');
    var findResult = users.find({ username: username });
    findResult.toArray(function(err, docs){
      if(err) return next(err);

      var doc = docs[0];
      if(doc) { // found duplicate
        console.log("2222 ---- duplicate found...");
        response = {
          status: 'fail',
          reason: {
            "username": "Already taken"
          }
        }
        res.send(JSON.stringify(response));
      }
      else{
        var user = {
          username: username,
          password: password
        };

        console.log("3333 ---- trying to insert...");
        users.insert(user, function(err, result){
          if(err) return next(err);
          var id = user._id;
          console.log(id);

          response = {
            status: 'success',
            data: {
              id: id,
              username: username
            }
          };
          res.send(JSON.stringify(response));
        });
      }
    });
  });
}

function loginUser(req, res, next) {
  console.log("trying to login...");
	var username = req.body.username || req.query.username;
	var password = req.body.password || req.query.password;


  var crypto = require('crypto');

  crypto.randomBytes(40, function(err, buf) {
    if(err) return next(err);
    var s, t;
    var hex = buf.toString('hex');
    s = hex.substr(0, 40);
    t = hex.substr(40);
  });

	// TODO Lookup user & pasword in database
  mongo.connect({}, function(err, db){
    if(err) return next(err);
    
    var users = db.collection('users');

    var fResult = users.find({username: username, password: password});
    fResult.toArray(function(err, docs) {
      if(err) return next(err);
    
      var doc = docs[0];
      if(doc) { // there is matching result
        crypto.randomBytes(40, function(err, buf) {
          if(err) return next(err);
          var s, t;
          var hex = buf.toString('hex');
          s = hex.substr(0, 40);
          t = hex.substr(40);

          var response = {
            status: 'success',
            data: {
              id: doc._id,
              session: s,
              token: t
            }
          };
          
          res.send(JSON.stringify(response));
        });
      } else {
        var response = {
          status: 'fail',
          data: {
            reason: "Username/password mismatch"
          }
        };

        res.send(JSON.stringify(response));
      }
    });

  });
	// TODO Create session
	// TODO Create Token
	// TODO Send reponse
}

module.exports.register = function(app, root) {
  console.log("register user...");
  
	app.post(root + 'login', loginUser);
  app.post(root + ':id/get', getUser);
  app.post(root + 'create', createUser);
  app.post(root + 'find/:username', findUser); 
}

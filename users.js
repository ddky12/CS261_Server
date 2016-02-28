var mongo = require('./db');
var redis = require('redis');
var redisClient = redis.createClient();

redisClient.on('connect', function () {
  console.log("connected to redis server..")
});

// function to get user data with provided id
function getUser(req, res, next) {
  // access input passed with either body or querystring
  console.log("trying to get user...");
  var id = req.body.id || req.query.id;

  mongo.connect({}, function (err, db) {
    if (err) return next(err);

    var users = db.collection('users');
    var ObjectID = require('mongodb').ObjectID;
    var fResult = users.find({ _id: ObjectID(id) });

    fResult.toArray(function (err, docs) {
      if (err) return next(err);

      var doc = docs[0];
      if (doc) { // found matching result
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
  console.log("trying to find user...");
  var username = req.body.username || req.query.username;

  mongo.connect({}, function (err, db) {
    if (err) return next(err);

    var users = db.collection('users');

    var fResult = users.find({ username: username });
    fResult.toArray(function (err, docs) {
      if (err) return next(err);

      var doc = docs[0];
      if (doc) { // found matching result
        var response = {
          status: 'succes',
          data: {
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
  console.log("trying to create user...");
  var username = req.body.username || req.query.username;
  var password = req.body.password || req.query.password;

  mongo.connect({}, function (err, db) {
    if (err) return next(err);
    console.log("1111 ---- trying to create... " + username);

    var users = db.collection('users');
    var findResult = users.find({ username: username });
    findResult.toArray(function (err, docs) {
      if (err) return next(err);

      var doc = docs[0];
      if (doc) { // found duplicate
        console.log("2222 ---- duplicate found...");
        var response = {
          status: 'fail',
          reason: {
            "username": "Already taken"
          }
        }
        res.send(JSON.stringify(response));
      }
      else {
        var user = {
          username: username,
          password: password,
          isAdmin: false
        };

        console.log("3333 ---- trying to insert...");
        users.insert(user, function (err, result) {
          if (err) return next(err);
          var id = user._id;
          console.log(id);

          var response = {
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
  console.log("trying to login user...");
  var username = req.body.username || req.query.username;
  var password = req.body.password || req.query.password;


  var crypto = require('crypto');

  crypto.randomBytes(40, function (err, buf) {
    if (err) return next(err);
    var s, t;
    var hex = buf.toString('hex');
    s = hex.substr(0, 40);
    t = hex.substr(40);
  });

  // TODO Lookup user & pasword in database
  mongo.connect({}, function (err, db) {
    if (err) return next(err);

    var users = db.collection('users');

    var fResult = users.find({ username: username, password: password });
    fResult.toArray(function (err, docs) {
      if (err) return next(err);

      var doc = docs[0];
      // there is matching result
      if (doc) {
        crypto.randomBytes(40, function (err, buf) {
          if (err) return next(err);
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
          
          // create a session in redis
          // flush existing login data replace with new one
          redisClient.hmset('currUser', {
            'id': doc._id,
            'username': doc.username,
            'isAdmin': doc.isAdmin,
            'session': s,
            'token': t
          }, function (err, object) {
            console.log("redis object set: " + object);
          });
          
          // set expire time
          //redisClient.expire('currUser', 120);

          res.send(JSON.stringify(response));
        });
        // there is a mismatch between username and password
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
}

function updateUser(req, res, next){
  console.log("trying to update user data...")
  var s = req.body._session || req.query._session;
  var t = req.body._token || req.query._session;
  
  // check if the session and token are mathcing with current data
  
}

module.exports.register = function (app, root) {
  console.log("register user...");

  app.post(root + 'login', loginUser);
  app.post(root + ':id/get', getUser);
  app.post(root + 'create', createUser);
  app.post(root + 'find/:username', findUser);
  app.post(root + ':id/update', updateUser);

  app.get(root + 'login', loginUser);
  app.get(root + ':id/get', getUser);
  app.get(root + 'create', createUser);
  app.get(root + 'find/:username', findUser);
  app.get(root + ':id/update', updateUser);
}

var mongo = require('./db');
var redis = require('redis');
var redisClient = redis.createClient();

redisClient.on('connect', function () {
  console.log("connected to redis server...users...")
});

// function to get user data with provided id
function getUser(req, res, next) {
  // access input passed with either body or querystring
  console.log("trying to get user...");
  var id = req.body.id || req.query.id || req.params.id;
  var s = req.body._session || req.query._session;
  var t = req.body._token || req.query._token;
  
  redisClient.exists('currUser', function (err, reply) {
    // session is found see if it is identical
    if (reply === 1) {
      redisClient.hgetall('currUser', function (err, obj) {
        console.log(obj);
        
        // if session and token matches, and is a admin account
        if (s == obj.session && t == obj.token) {
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
                  status: "success",
                  data: {
                    "id": doc._id,            
                    "username": doc.username,
                    "avatar": doc.avatar
                  }
                };

                res.send(JSON.stringify(response));
              }
            });
          });
        }
      });
    }
  });


  
}

function findUser(req, res, next) {
  console.log("trying to find user...");
  var username = req.body.username || req.query.username || req.params.username;
  var s = req.body._session || req.query._session;
  var t = req.body._token || req.query._token;

  redisClient.exists('currUser', function (err, reply) {
    // session is found see if it is identical
    if (reply === 1) {
      redisClient.hgetall('currUser', function (err, obj) {
        console.log(obj);
        
        // if session and token matches, and is a admin account
        if (s == obj.session && t == obj.token) {
          mongo.connect({}, function (err, db) {
            if (err) return next(err);

            var users = db.collection('users');

            var fResult = users.find({ username: username });
            fResult.toArray(function (err, docs) {
              if (err) return next(err);

              var doc = docs[0];
              if (doc) { // found matching result
                var response = {
                  status: "success",
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
      });
    }
  });
      
  
}

function createUser(req, res, next) {
  console.log("trying to create user...");
  var username = req.body.username || req.query.username;
  var password = req.body.password || req.query.password;
  var avatar = req.body.avatar || req.query.avatar;
  
  if(avatar == null){
    avatar = "not-existing";
  }

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
          reason: {
            "username": "Already taken"
          },
          status: "fail"
        }
        res.send(JSON.stringify(response));
      }
      else {
        var user = {
          username: username,
          password: password,
          avatar: avatar,
          isAdmin: false
        };

        console.log("3333 ---- trying to insert...");
        users.insert(user, function (err, result) {
          if (err) return next(err);
          var id = user._id;
          var response = {
            status: "success",
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
            status: "success",
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
          reason: "Username/password mismatch",
          status: "fail"
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
  var id = req.body.id || req.query.id || req.params.id;
  var oldPassword = req.body.oldPassword || req.query.oldPassword;
  var newPassword = req.body.newPassword || req.query.newPassword;
  var isAdmin = req.body.isAdmin || req.query.isAdmin;
  var avatar = req.body.avatar || req.query.avatar;
  
  // check if the session and token are mathcing with current data
  redisClient.exists('currUser', function (err, reply) {
    // session is found see if it is identical
    if (reply === 1) {
      redisClient.hgetall('currUser', function (err, obj) {
        console.log(obj);
        
        // if session and token matches, and is a admin account
        if (s == obj.session && t == obj.token) {
          console.log("checking admin...");
          
          // if both of the parameter exists  
          mongo.connect({}, function (err, db) {
            if (err) return next(err);
            var users = db.collection('users');
            var ObjectID = require('mongodb').ObjectID;
            var fResult = users.find({ _id: ObjectID(id) });
            fResult.toArray(function (err, docs) {
              // compare if the old password is matching current one
              var doc = docs[0];
              if(doc){
                console.log("found matching user...");
                var isPasswordChanged = false;
                if(isAdmin){
                  if (obj.isAdmin == 'true'){
                    var uIsAdmin = doc.isAdmin;
                    if(isAdmin) {uIsAdmin = isAdmin;}
                    users.updateOne(
                      {username: obj.username},
                      { $set: { 
                        "isAdmin": uIsAdmin,
                        "avatar": uAvatar
                        }
                      });
                  }
                  else{
                    //forbidden
                    var response_admin = {
                      status: "fail",
                      reason: {
                        "isAdmin": "Forbidden"
                      }
                    };
                    
                    res.send(JSON.stringify(response_admin));
                    return;
                  }
                }
                
                
                if(oldPassword && newPassword){
                  if(oldPassword == doc.password){
                    users.updateOne(
                      {username: obj.username},
                      { $set: { 
                        "password": newPassword
                        }
                      });
                    isPasswordChanged = true;
                  }
                  else{
                    //forbidden
                    var response_oldpass = {
                      status: "fail",
                      reason: {
                        "oldPassword": "Forbidden"
                      }
                    };
                    res.send(JSON.stringify(response_oldpass));
                    return;
                  }
                }
                // setting is admin & avatar
                
                var uAvatar = doc.avatar;
                if(avatar) {uAvatar = avatar;}
                users.updateOne(
                  {username: obj.username},
                  { $set: { 
                    "avatar": uAvatar
                    }
                  });
                
                var response_success = {
                  status: "success",
                  data:{
                    isAdmin: isAdmin,
                    passwordChanged: isPasswordChanged,
                    avatar: avatar
                  }
                }
                
                res.send(JSON.stringify(response_success));
              }
            });
          });
        }
      });
    }
  });
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

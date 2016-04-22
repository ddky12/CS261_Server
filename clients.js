var mongo = require('./db');
var redis = require('redis');
var redisClient = redis.createClient();

redisClient.on('connect', function () {
  console.log("connected to redis server...clients...")
});

function getClient(req, res, next){
  console.log("trying to update user data...")
  var s = req.body._session || req.query._session;
  var t = req.body._token || req.query._session;
  
  var md5Hash = "061f338ec123105462013374269fd1b2";
  var downloadURL = "yoonyoung-k.cs261.net/api/v1/clients/download/yoonyoung-k_client.zip"
  var version = "v1.0.0"
  var lastUpdated = "2016-03-20T18:20:10+00:00"
  
  // check if the session and token are mathcing with current data
  redisClient.exists('currUser', function (err, reply) {
    // session is found see if it is identical
    if (reply === 1) {
      redisClient.hgetall('currUser', function (err, obj) {
        console.log(obj);
        
        // if session and token matches, and is a admin account
        if (s == obj.session && t == obj.token) {
          var response_success = {
            status: "success",
            data:{
              url: downloadURL,
              hash: md5Hash,
              version: version,
              lastUpdated: lastUpdated
            }
          }
          
          res.send(JSON.stringify(response_success));
          return;
        }
        else {
          var response_fail = {
            status: "fail",
            reason: {
            "Authentication": "Fail"
            }
          }
          
          res.send(JSON.stringify(response_success));
          return;
        }
      });
    }
  });
}

module.exports.register = function (app, root) {
  console.log("register client...");

  app.post(root + 'get', getClient);

  app.get(root + 'get', getClient);
}

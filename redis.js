var redis = require('redis');
var redisClient = redis.createClient();

redisClient.on('connect', function() {
  console.log("connected to redis server..")
});
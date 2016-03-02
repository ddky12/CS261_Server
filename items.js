var mongo = require('./db');
var redis = require('redis');
var waterfall = require('async-waterfall');
var redisClient = redis.createClient();

redisClient.on('connect', function () {
  console.log("connected to redis server...items...")
});

function createItem(req, res, next) {
  console.log("trying to create an item...");

  var s = req.body._session || req.query._session;
  var t = req.body._token || req.query._token;
  var shortname = req.body.shortname || req.query.shortname;
  
  // check if the session and toekn is matching the current login data
  redisClient.exists('currUser', function (err, reply) {
    // session is found see if it is identical
    if (reply === 1) {
      redisClient.hgetall('currUser', function (err, obj) {
        console.log(obj);
        
        // if session and token matches, and is a admin account
        if (s == obj.session && t == obj.token) {
          console.log("checking admin...");
          if (obj.isAdmin == 'true') {
            console.log("admin approved...")
            //database query
            mongo.connect({}, function (err, db) {
              if (err) return next(err);

              var items = db.collection('items');
              var fResult = items.find({ shortname: shortname });

              fResult.toArray(function (err, docs) {
                if (err) return next(err);

                var doc = docs[0];
                // item duplicate found using shortname
                if (doc) {
                  var response = {
                    status: "fail",
                    reason: {
                      "shortname": "Already taken"
                    }
                  }

                  console.log("item " + shortname + " duplicate found");
                  res.send(JSON.stringify(response));
                }
                // no duplicate found, inserting item
                else {
                   var item = {
                    shortname: shortname,
                    name: shortname,
                    description: "",
                    isStackable: false,
                    attributes: {}                    
                  };

                  console.log("inserting item...")
                  items.insert(item, function (err, result) {
                    if (err) return next(err);
                    var itemId = item._id;
                    var response = {
                      status: "success",
                      data: {
                        id: itemId,
                        shortname: shortname
                      }
                    };

                    res.send(JSON.stringify(response));
                  });
                }//else end
              })//find end
            });//query end
          }
          // if it is not an admin
          else {
            console.log("not an admin fail...")
            var response = {
              status: "fail",
              "reason": "Forbidden"
            }

            res.send(JSON.stringify(response));
          }
        }
      });
    } else {
      console.log('session doesn\'t exist');
      //res.send(JSON.stringify({temp: 'temp'}));
    }
  });
}// createItem

function updateItem(req, res, next) {
  var s = req.body._session || req.query._session;
  var t = req.body._token || req.query._token;
  var id = req.body.id || req.query.id || req.params.id;
  var name = req.body.name || req.query.name;
  var description = req.body.description || req.query.description;
  var isStackable = req.body.isStackable || req.query.isStackable;
  var attributes = req.body.attributes || req.query.attributes;


  redisClient.exists('currUser', function (err, reply) {
    if (reply === 1) {
      redisClient.hgetall('currUser', function (err, obj) {
        console.log(obj);
        
        // if session and token matches, and is a admin account
        if (s == obj.session && t == obj.token) {
          // an admin proceed
          console.log("testing admin...")
          if (obj.isAdmin == 'true') {
            console.log("auth confirmed...");

            mongo.connect({}, function (err, db) {
              if (err) return next(err);

              var items = db.collection('items');
              var ObjectID = require('mongodb').ObjectID;
              var fResult = items.find({ _id: ObjectID(id) });
              
              
              
              fResult.toArray(function (err, docs) {
                if (err) return next(err);

                var doc = docs[0];
                // item found using its data
                if (doc) {
                  var uName = null;
                  var uDescription = "";
                  var uIsStackable = false;
                  var uAttributes = {};
                  
                  uName = doc.name;
                  uDescription = doc.description;
                  uIsStackable = doc.isStackable;
                  uAttributes = doc.attributes;
                  
                  
                  // updating data if there are any inputs
                  if(name) {uName = name;}
                  if(description) {uDescription = description;}
                  if(isStackable) {uIsStackable = isStackable;}
                  if(attributes) {uAttributes = attributes;}
                  
                  items.updateOne(
                    {_id: ObjectID(id)},
                    { $set: { 
                      "name": uName,
                      "description": uDescription,
                      "isStackable": uIsStackable,
                      "attributes": uAttributes 
                      }
                    }
                  );
                  
                  var response = {
                    status: "success",
                    data:{
                      id: id,
                      name: name,
                      description: description,
                      isStackable: isStackable,
                      attributes: attributes
                    }
                  };
                  
                  res.send(JSON.stringify(response));
                }
              })//find end 
            });//query end
          }
          // not an admin fail
          else {
            console.log("not an admin fail...")
            var response = {
              status: "fail",
              "reason": "Forbidden"
            }

            res.send(JSON.stringify(response));
          }// else end
        }
      });
    }
    else {
      //no session
    }
  });
}

function getItem(req, res, next) {
  var id =  req.body.id || req.query.id || req.params.id;
  
  console.log("ID : " + id);
  
  mongo.connect({}, function (err, db) {
    if(err) return next(err);
    
    var items = db.collection('items');
    var ObjectID = require('mongodb').ObjectID;
    var fResult = items.find({ _id: ObjectID(id) });
    
    fResult.toArray(function(err, docs){
      var doc = docs[0];
      if(doc){
        
        var uName = doc.name;
        var uDescription = doc.description;
        var uIsStackable = doc.isStackable;
        var uAttributes = doc.attributes;
        
        var response = {
          status: "success",
          data: {
            id: id,
            shortname: doc.shortname,
            name: uName,
            description: uDescription,
            isStackable: uIsStackable,
            attributes: uAttributes
          }
        };
        
        res.send(JSON.stringify(response));
      }
      else{
        // not found
      }
    });//find end
  });//query end
}

function makeFindFunction(db, err, shortname, next){
  return function(){
    if(err) return next(err);
    var items = db.collection('items');
    return items.find({shortname : shortname});
  }
}

function makeItemFunction(fResult, i){
  return function( ){
    fResult.toArray(function(err, docs){
      var doc = docs[0];
      if(doc){
        var insertingItem = {
          id: doc._id,
          shortname: doc.shortname,
          name: doc.name,
          description: doc.description,
          isStackable: doc.isStackable,
          attributes: doc.attributes 
        };
        
        console.log("existing inserting item: " + insertingItem);
        return insertingItem;
      }
      else{
        console.log("non-existing inserting item");
        return {};
      }
    });
  }
}

function findItem(req, res, next) {
  
  // retrieving shortnames from the req
  var inputItem;
  
  for (var name in req.body) {
  if (req.body.hasOwnProperty(name)) {
    if(name == "shortnames"){
      inputItem = req.body[name];
      }
    }
  }
  
  for (var name in req.query) {
  if (req.query.hasOwnProperty(name)) {
    if(name == "shortnames"){
      inputItem = req.query[name];
      }
    }
  }
  
  if(inputItem == null){
      var response = {
        status: "fail",
        reason: {
          "shortnames": "Not found"
        }
      };
      res.send(JSON.stringify(response));
      return;
  };
  
  mongo.connect({}, function (err, db) {
    if(err) return next(err);

    var itemsArray = [];
    
    for(var i = 0, itemCount = inputItem.length; i < itemCount; i++){
      var shortname = inputItem[i];
      var findFunction = makeFindFunction(db, err, shortname, next);
      
      var itemFunction = makeItemFunction(findFunction(), i);
      var insertingData = itemFunction();
      
      console.log(JSON.stringify(insertingData));
      itemsArray.push(insertingData);
      
      if(i == inputItem.length - 1){
        var response = {
          status : "success",
          data: {
            items: itemsArray
          }
        };
        res.send(JSON.stringify(response));
      }
    }
  });
}

function listItem(req, res, next) {
  mongo.connect({}, function (err, db) {
    var items = db.collection('items');

    items.find({}).toArray(function(err, docs){
      var itemArray = [];
      for(var i = 0; i < docs.length; i++){
        var item = {
          id: docs[i]._id,
          shortname: docs[i].shortname,
          name: docs[i].name,
          description: docs[i].description,
          isStackable: docs[i].isStackable,
          attributes: docs[i].attributes 
        }
        
        itemArray.push(item);
        
        if(i == docs.length - 1){
          var response = {
            status: "success",
            data: {
              items : itemArray
            }
          };
          
          res.send(JSON.stringify(response));
        }
      }
    });
  });
}

module.exports.register = function (app, root) {
  console.log("register items...");

  app.post(root + 'create', createItem);
  app.post(root + ':id/update', updateItem);
  app.post(root + ':id/get', getItem);
  app.post(root + 'find', findItem);
  app.post(root + 'list', listItem);

  app.get(root + 'create', createItem);
  app.get(root + ':id/update', updateItem);
  app.get(root + ':id/get', getItem);
  app.get(root + 'find', findItem);
  app.get(root + 'list', listItem);
}
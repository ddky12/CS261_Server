function createItem(req, res, next) {
  console.log("trying to create an item...");
  
  var 
}

module.exports.register = function(app, root) {
  console.log("register items...");
  
  app.post(root + 'find/:username', create);
  app.get(root + 'find/:username', create);
}
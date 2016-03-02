var express = require('express');

var app = express();

var motd = require('./motd');
var users = require('./users');
var items = require('./items');
var headerMiddleware = require('./header');
var bodyMiddleware = require('body-parser');

var apiRoot = '/api/v1/';

app.use(headerMiddleware());
app.use(bodyMiddleware.json());

motd.register(app, apiRoot + 'motd/');
users.register(app, apiRoot + 'users/');
items.register(app, apiRoot + 'items/');

app.listen(7000);

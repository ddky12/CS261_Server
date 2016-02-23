var express = require('express');

var app = express();

var motd = require('./motd');
var users = require('./users');
var headerMiddleware = require('./header');
var bodyMiddleware = require('body-parser');

var apiRoot = '/';

app.use(headerMiddleware());
app.use(bodyMiddleware.json());

motd.register(app, apiRoot + 'motd/');
users.register(app, apiRoot + 'users/');

app.listen(7000);

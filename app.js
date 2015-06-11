var path = require('path');
var Server = require(path.resolve(__dirname ,'Server.js'));
var server = module.exports = new Server();
server.listen();
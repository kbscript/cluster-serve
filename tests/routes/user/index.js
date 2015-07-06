
var User = require('./user.js');
exports.get = function (request, response, next){
    var user = new User();

    response.status(200).send(user.get({email: "kevinbarnett@test.com"})).end();
};
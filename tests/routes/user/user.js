var users = [{name: "Kevin Barnett", email: "kevinbarnett@test.com"}, {name: "Caleb Barnett", email: "calbarnett@test.com"}, {name: "Jack Barnett", email: "jackbarnet@test.com"}];

var User = function () {

};

User.prototype.get = function (params, callback) {
    setTimeout(function (params) {
        var i;
        for (i=0; i < users.length; i++){
            if (params.email === users[i].email) { return callback(null, users[i])}
        }
    },0, params)
};
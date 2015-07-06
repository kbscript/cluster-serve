var assert = require('assert');
var path = require('path');

var Router = require('../lib/Router.js');
var router;

describe("Create new router", function () {

    before("setup new router",function(){
        router = new Router({root:path.join(__dirname,"./routes"), exclude: ["private", /(^|\\|\/)\./]}, function (error) {
            if (error) { throw error}
        });
    });

    it("has and array of routes", function () {
        var routes = [
            path.join(__dirname, "./routes/index.js"),
            path.join(__dirname,"./routes/admin/index.js"),
            path.join(__dirname, "./routes/user/index.js")
        ];
        assert.deepEqual(router.routes, routes, "invalid routes." );
    });
});




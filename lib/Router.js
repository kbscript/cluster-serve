var swig = require('swig');
var Async = require('async-next');
var resolve = require('path').resolve;
var fs = require('fs');
var _map = Array.prototype.map;

var Router = module.exports = function (params, callback) {
    var router = this, async = new Async();

    router.root = resolve(params.root);
    router.excludeFiles = params.exclude;
    router.routes = [];
    router.indexRegExp = new RegExp(params.index || "index.js" + "$");

    try{
        router.loadRoutes(router.root);
        callback(null,router);
    }

    catch(error){
        console.log(error);
        console.log(error.stack);
        callback(error,null);
    }
};

Router.prototype.loadRoutes = function (path) {
    var router = this;
    var paths = _map.call(fs.readdirSync(path) || [], function (subPath) { return resolve(path + "/" + subPath); });
    var routes = paths.filter(function (filePath) {
        return fs.statSync(filePath).isFile() && !router.exclude(filePath);
    });

    router.routes = router.routes.concat(routes);

    //now look for sub dir recursively.

    _map.call(paths || [], function (dirPath) {
        if (fs.statSync(dirPath).isDirectory()){ router.loadRoutes(dirPath); }
    });

};

Router.prototype.exclude = function (filePath) {
    var router = this;
    return !router.indexRegExp.test(filePath);
};
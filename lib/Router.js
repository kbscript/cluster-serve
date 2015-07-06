var swig = require('swig');
var Async = require('async-next');
var resolve = require('path').resolve;
var fs = require('fs');
var _map = Array.prototype.map;


/*
* Initialize a new Router
*
* settings:
*   - "root" - string of root folder to use for routes
*   - "actions" - array of route actions to be called on route module.  Default ['get', 'post', 'delete']
*   - "exclude" - array of string or regExp values to be excluded from routes.  String will be converted to a regExp
*
*
* @param {Object} settings
* @param {Function} callback
*
* @return {Object} self
*
*/
var Router = module.exports = function (settings, callback) {
    var router = this;

    router.root = resolve(settings.root);
    router.excludeFiles = settings.exclude || [];

    //check excludeFiles for string and convert to regexp
    var i;
    for (i=0; i < router.excludeFiles.length; i++){
        if (typeof router.excludeFiles[i] === "string") { router.excludeFiles[i] = new RegExp(router.excludeFiles[i],"i");}
    }

    router.routes = [];
    router.actions = settings.actions || ["get", "post", "delete"];
    router.indexRegExp = new RegExp(settings.index || "index.js" + "$");

    if (typeof callback !== "function") { throw new Error("a callback function is required.")}

    try{
        //load routes
        router.loadRoutes(router.root);
        //build route lookup
        for (i=0; i < router.routes.length; i++){
            router.routes[router.routes[i]] = undefined;
        }
        //callback when complete
        callback(null,router);
    }

    catch(error){
        console.log(error);
        console.log(error.stack);
        callback(error,null);
    }
};


/*
* Recursive loop through path to find all valid routes.  Uses Router.prototype.exclude to check for invalid routes
*
* @param {String} path
*/
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

/*
* Checks if the given filePath is valid.  Returns true if filePath does not match indexRegExp or matches excludeFiles regExp.
*
* @param {String} filePath
* @return {Boolean}
*/
Router.prototype.exclude = function (filePath) {
    var router = this, valid = false, i;
    if (!router.indexRegExp.test(filePath)) { return true;}

    for (i=0; i < router.excludeFiles.length; i++) {
        if (router.excludeFiles[i].test(filePath)) { return valid = true;}
    }

    return false;
};

Router.prototype.handler = function (request, response, next) {
    var router = this, async = new Async(), routePath, routeModule, routeDependency;

    var routeModule = router.require();


    return this;
};

Router.prototype.require = function (filePath) {
    var router = this;
    if (router.routes[filePath] !== undefined) {return router.routes[filePath];}

    try{
        router.routes[filePath] = require(filePath);
    }
    catch(error){
        throw new Error(error,Router.prototype.require);
    }
};
var swig = require('swig');
var Async = require('async-next');
var resolve = require('path').resolve;
var join = require('path').join;
var fs = require('fs');
var util = require('util');
var _map = Array.prototype.map;


/*
* Initialize a new Router
*
* settings:
*   - "root" - string of root folder to use for routes
*   - "actions" - array of route actions to be called on route module.  Default ['get', 'post', 'delete']
*   - "index" - string of route module file name.  Default index.js
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
    router.index = settings.index || "index.js";
    router.indexRegExp = new RegExp(router.index + "$");
    router.timeoutMS = settings.timeoutMS || 120000;

    if (typeof callback !== "function") { throw new Error("a callback function is required.")}

    try{
        //load routes
        router.loadRoutes(router.root);

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
    var router = this, async = new Async(), routePath, routeModule, routeAction, routeDependency, indexName;

    indexName = router.index.replace(/\.js$/i,"");
    routePath = join(router.root, request.url.replace(indexName, ""), router.index);

    if ( routePath.indexOf(router.root) !== 0) { response.status(403).end();}

    if (router.routes.indexOf(routePath) === -1) {return next();}

    routeModule = router.require(routePath);

    if (!routeModule) { return next(); }

    //check for dependents
    if (util.isArray(routeModule.use)) {
        async.next();
    }

    //get route action
    routeAction = String(request.method).toLowerCase() || "get";

    if (typeof routeModule[routeAction] !== "function") { return next();}

    async.next(function (next) {
        routeModule[routeAction](request, response, next);
        next();
    });

    async.next.start(function () {

    });

    return this;
};

Router.prototype.require = function (filePath) {
    var router = this;
    if (router.routes[filePath] !== undefined) {return router.routes[filePath];}

    return router.routes[filePath] = require(filePath);
};
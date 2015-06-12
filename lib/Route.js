var swig = require('swig');
var Async = require('async-next');
var path = require('path');
var fs = require('fs');

var Route = module.exports = function (request, response, routeDef, next) {
    var route = this;

    route.request = request;
    route.response = response;
    route.routeDef = routeDef;
    route.root = routeDef.root;
    route.next = next;
    route.attempts = 1;
    route.module = undefined;
    route.valid = false;

    route.callPath = String(request.params[0]).toLowerCase().replace(/\/$/g, "");
    if (!route.callPath) {
        console.log("Route called with no path.");
        return next();
    }

    route.verb = route.checkVerb();

    process.nextTick(route.init.bind(route));
};

Route.prototype.init = function (next) {
    var route = this, async = new Async();

    //check valid
    async.next(route.isValid.bind(route));

    //require module
    async.next(route.require.bind(route));

    //get module dependency
    async.next(route.moduleDependency.bind(route));

    async.next(route.load.bind(route));

    async.next.start(next);
};

Route.prototype.isValid = function (next) {
    var route = this, statCallback;
    route.path = path.join(route.root, route.callPath);

    if (route.path.indexOf(route.root) !== 0) {
        next();
        route.send(403);
        return route.end();
    }

    statCallback = function (err, stats) {
        if (err || !stats) {
            return route.next()
        }

        if (stats.isDirectory()) {
            route.path = path.join(route.path, "index.js");
        }
        route.valid = true;
        next();
    };

    fs.stat(route.path, statCallback);
};

Route.prototype.checkVerb = function () {
    var route = this, verbRegEx = /\/new$|\/get$|\/udpate$|\/delete$/i, verb = (verbRegEx.exec(route.callPath) || "")[0];

    if (verb) {
        route.callPath = route.callPath.replace(verbRegEx,"");
        return verb.replace(/\//g,"");
    }

    return "";
};

Route.prototype.require = function (next) {
    var route = this;

    if (!route.valid) { return next();}

    try {
        route.module = require(route.path);
        route.action = route.verb || "get";
        if (typeof route.module[route.action] !== "function") {
            route.next();

            return next();
        }

        next();
    }
    catch (error) {
        console.log(error);
        next();
        route.send(404);
        route.end();
    }
};

Route.prototype.moduleDependency = function (next) {
    var route = this, dependency = route.routeDef.options.dependency, map, prop, async = new Async();

    if (!route.valid || !dependency) {
        return next();
    }

    try {
        map = require(dependency);
        for (prop in map) {
            if (!map.hasOwnProperty(prop)) {continue;}
            async.next(map[prop].bind(route))
        }

        async.next.start(next)
    } catch (error) {
        console.log(error);
        next();
    }
};

Route.prototype.load = function (next) {
    var route = this;

    if (!route.valid) {
        return next();
    }

    route.module[route.action](route.request, route.response);
};

Route.prototype.render = function (view, data) {
    var route = this, html;

    html = swig.renderFile(view, data);
    route.send(200, html);
    route.end();
};

Route.prototype.send = function (_code, _data) {
    var route = this;

    //check if the header has already been set - if so then we're calling send more than once and need to find the bug
    if (route.ended || route.sent || route.response._headerSent) {
        return false;
    }

    //check if only one param is passed if so then assume that code is the data to send
    var data = _data || _code;

    _data ? route.response.jsonp(_code, data) : route.response.send(200, data);

    route.sent = true;
};

Route.prototype.jsonp = function (_code, _data) {
    var route = this;

    //check if the header has already been set - if so then we're calling send more than once and need to find the bug
    if (route.ended || route.sent || route.response._headerSent) {
        return false;
    }

    //check if only one param is passed if so then assume that code is the data to send
    var data = _data || _code;

    _data ? route.response.jsonp(_code, data) : route.response.jsonp(200, data);

    route.sent = true;
};

Route.prototype.sendfile = function () {
    var route = this;
    var response = route.response;

    if (route.ended || route.sent || route.response._headerSent) {
        return;
    }

    response.sendfile.apply(response, Route.prototype.sendfile.arguments);
    route.sent = true;
};

Route.prototype.redirect = function () {
    var route = this;
    var response = route.response;
    response.redirect.apply(response, Route.prototype.redirect.arguments);
};

Route.prototype.set = function () {
    var route = this;
    var response = route.response;
    response.set.apply(response, Route.prototype.set.arguments);
};

Route.prototype.end = function () {
};

Route.prototype.on = function () {
    var route = this;
    var response = route.response;
    response.on.apply(response, Route.prototype.on.arguments);
};

function Cache() {
    var store = {};
    this.get = function (key) {
        //check filesystem for changes
        var stats = fs.statSync(key);
        console.log(util.inspect(stats));

        if (typeof store[key] === "undefined" || store[key].mtime < stats.mtime) {
            store[key] = {mtime: stats.mtime, value: undefined};
            return undefined;
        }

        return store[key].value;
    };
    this.set = function (key, value) {
        store[key].value = value;
    };
};

//manage swig cache
swig.setDefaults({cache: new Cache()});
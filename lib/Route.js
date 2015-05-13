var swig = require( 'swig' );

var Route = module.exports = function ( request, response, next ) {
    var route = this;

    route.request = request;
    route.response = response;
    route.next = next;

    process.nextTick( route.init.bind( route ) );
};

Route.prototype.init = function ( next ) { };

Route.prototype.isValid = function ( next ) { };

Route.prototype.checkVerb = function ( next ) { };

Route.prototype.require = function ( next ) { };

Route.prototype.render = function ( next ) { 

};

Route.prototype.send = Route.prototype.jsonp = function ( code, data ) { 

};

Route.prototype.on = function () { };

Route.prototype.sendFile = function () { };

Route.prototype.set = function () { };

Route.prototype.end = function () { };
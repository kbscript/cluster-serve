var swig = require( 'swig' );

var Route = module.exports = function ( request, response, next ) {
    var route = this;

    route.request = request;
    route.response = response;
    route.next = next;
    
    route.callPath = "";
    route.verb = "";

    process.nextTick( route.init.bind( route ) );
};

Route.prototype.init = function ( next ) {
    var route = this;

    //check valid
    route.isValid(next);

    //require module
    route.require(next);
};

Route.prototype.isValid = function ( next ) { };

Route.prototype.checkVerb = function ( next ) { };
Route.prototype.checkVerb.define = {
    name: "checkVerb",
    description: "Used to get verb from path so it can be called in api export function.  Returns empty string if not found or string of valid verb (new, get, update, delete) if found.",
    params: [
        {name: "this", default: {callPath: "string", verb: "string" }, type: "new Route()", description: "Route object passed as context to function.  Should have properties callPath, verb"}
    ],
    returns: "string"
};

Route.prototype.require = function ( next ) { };

Route.prototype.render = function ( view, data ) {
    var route = this, html;
    
    html = swig.renderFile( view, data );
    route.send( 200, html );    
    route.end( );
};

Route.prototype.send = function ( _code, _data ) {
    var route = this;
    
    //check if the header has already been set - if so then we're calling send more than once and need to find the bug
    if ( route.ended || route.sent || route.response._headerSent ) { return false; }
    
    //check if only one param is passed if so then assume that code is the data to send
    var data = _data || _code;
    
    _data ? route.response.jsonp( _code, data ) : route.response.send( 200, data );
    
    route.sent = true;
};

Route.prototype.jsonp = function ( code, data ) {
    var route = this;
    
    //check if the header has already been set - if so then we're calling send more than once and need to find the bug
    if ( route.ended || route.sent || route.response._headerSent ) { return false; }       
    
    //check if only one param is passed if so then assume that code is the data to send
    var data = _data || _code;
    
    _data ? route.response.jsonp( _code, data ) : route.response.jsonp( 200, data );
    
    route.sent = true;
};

Route.prototype.sendfile = function () {
    var route = this;
    var response = route.response;
    
    if ( route.ended || route.sent || route.response._headerSent ) { return; }

    response.sendfile.apply( response, Route.prototype.sendfile.arguments );
    route.sent = true;
};

Route.prototype.redirect = function () {
    var route = this;
    var response = route.response;
    response.redirect.apply( response, Route.prototype.redirect.arguments );
};

Route.prototype.set = function () {
    var route = this;
    var response = route.response;
    response.set.apply( response, Route.prototype.set.arguments );
};

Route.prototype.end = function () { };

Route.prototype.on = function () {
    var route = this;
    var response = route.response;
    response.on.apply( response, Route.prototype.on.arguments );
};

function Cache() {
    var store = {};
    this.get = function ( key ) {  //jslint ignore
        //check filesystem for changes
        var stats = fs.statSync( key );
        console.log( util.inspect( stats ) );
        
        if ( typeof store[key] === "undefined" || store[key].mtime < stats.mtime ) {
            store[key] = { mtime: stats.mtime, value: undefined }
            return undefined;
        }
        
        return store[key].value;
    };
    this.set = function ( key, value ) {
        store[key].value = value;
    };
};

//manage swig cache
var cache = new Cache();
swig.setDefaults( { cache: cache } );
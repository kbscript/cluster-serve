var Path = require( 'path' );
var Domain = require( 'domain' );
var Util = require( 'util' );
var fs = require( 'fs' );
var debug = process.env.remote;

var express = require( 'express' );
var favicon = require( 'serve-favicon' );
var bodyparser = require( 'body-parser' );
var compression = require( 'compression' );
var cookieParser = require( 'cookie-parser' );
var sersveStatic = require( 'serve-static' );

var log = function ( msg, error ) {
    console.log( (msg || error) + "\n" );
}

var Server = function () {
    var server = this;
               
    server.ssl = process.env.ssl || false;
    server.port = process.env.port || 443;
    server.id = process.env.wid;
    server.killtimer = null;
    server.root = process.env.root || "";
    server.hostname = process.env.hostname;
    try { server.static = JSON.parse( process.env.staticRoutes ); } catch ( err ) { console.log( err ); }
    server.static = server.static || [{ root: Path.join( server.root, 'public' ), options: {} }];      
    
    var app = express( ), i;
    server.app = app;
    app.set( 'port', server.port );
    if ( process.env.favicon  ) { app.use( favicon( Path.resolve( process.env.favicon ) ) ); }
    app.use( bodyparser.json( ) );
    app.use( bodyparser.urlencoded( ) );
    app.use( compression( ) );
    app.use( cookieParser( ) );    
    app.use( server.cors );
    
    //add static routes
    for ( i = 0; i < server.static.length; i++ ) { 
        app.use( sersveStatic( server.static[i].root, server.static[i].options ) );
    }
    
    //add data routes       
    console.log( process.cwd() );

    process.on( "message", function ( data ) {
        if ( data == "exit" ) { server.kill( ); }
    } );

    server.listen( );
};

Server.prototype.cors = function ( request, response, next ) {
    response.header( "Access-Control-Allow-Origin", "*" ); //You can insert domains separated by commas if you want to allow only certain origins
    response.header( "Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS" );
    response.header( "Access-Control-Allow-Credentials", true );
    response.header( "Access-Control-Allow-Headers", "X-Requested-With, Access-Control-Allow-Origin, X-HTTP-Method-Override, Content-Type, Authorization, Accept" );
    
    var useragent = require( 'useragent' );
    var newContentType = 'application/json;charset=utf-8"';
    var useragentString = request.headers['user-agent'];
    var contentType = request.headers['content-type'] || '';
    
    var ua = useragent.lookup( useragentString );
    // we are indeed using IE
    if ( ua && ua.family === 'IE' && ( ua.major === '8' || ua.major === '9' ) ) {
        if ( request.headers.accept === '*/*' ) {
            if ( !contentType.length || contentType === 'text/plain' ) {
                request.headers['content-type'] = newContentType;
            }
        }
    }//end if ie                

    next( );
};

Server.prototype.kill = function (request, response, error) {
    var server = this;
    if ( server.killtimer ) { return; }
    
    if ( error ) {        
        logErr.error( error.stack );
        logErr.error( error.message );
        log( error.message || error );
        log( error.stack  || "No stack provided." );
    }

    //make sure we exit after 30 sec.
    server.killtimer = setTimeout( function () {
        log( "Kill in server.js killtimer. Pocess: " + process.pid );
        process.exit( );    
    }, 30000 );

    try { if ( response && !response._headerSent ) { response.jsonp( 500, { error: {msg: error.message || String(error), stack: error.stack} } ); response.end( ); } } catch ( sendError ) { log( "", sendError );}
    
    if ( request && request.domain ) { request.domain.exit( ); }

    var cluster = require( 'cluster' );
    if ( cluster.worker ) { return cluster.worker.disconnect( ); }

    //if we got here then we couldn't disconnect properly and will exit
    exitProcess( );
};

Server.prototype.listen = function () {
    var server = this;
    try {                 
        server.http = server.ssl ? require( 'https' ).createServer( server.credentials() , server.app ) : require( 'http' ).createServer( server.app );
    }     
    catch ( error ) {
        return log( "", " Error creating httpServer " + server.hostname + ".  Error: " + error );
        exitProcess( );
    }
    
    //try socket.io
    try { server.io = require( 'socket.io' )( server.http ); server.io.on( 'connection', socketConnection ); } catch ( error ) { log( "", error ); }
    
    server.http.on( 'error', function ( error ) {
        log( "", "Error starting server " + server.hostname + ". Error: " + error.code );
        exitProcess( );
    } );
    server.http.listen( server.port, server.hostname, 128, function () {
        log( "Server " + server.hostname + " is listening on " + server.http.address( ).address + ", port: " + server.port + ".  Worker: " + process.env.wid + " Process: " + process.pid  );        
    } );            
}

var exitProcess = function () { 
    setTimeout( function () { process.exit( ); }, 5000 );
};

Server.prototype.credentials = function () {
    var server = this, constants = require('constants') , credentials, privateKey, certificate, gD1
    try { 
        privateKey = fs.readFileSync( '/etc/pki/tls/certs/' + server.hostname + '.key' ).toString( );
        certificate = fs.readFileSync( '/etc/pki/tls/certs/' + server.hostname + '.crt' ).toString( );
        gD1 = fs.readFileSync( '/etc/pki/tls/certs/gd_bundle_' + server.hostname + '.crt' ).toString( );
        credentials = { secureProtocol: 'SSLv23_method', secureOptions: constants.SSL_OP_NO_SSLv3, key: privateKey, cert: certificate, ca: gD1 };
    } 
    catch ( error ) {
        log( "", " Error loading credentials for " + server.hostname + ".  Error: " + error );
        exitProcess( );
    }

    return credentials;
};

var socketConnection = function ( socket ) {
    console.log( "Socket Connected" );
    socket.on( 'disconnect', socketDisconnect );
};

var socketDisconnect = function () {
    var socket = this;
    console.log( "Socket Disconnected" );
};

var requestOnError = function (error) {
    var domain = error.domain;
    var server = this;
    var request = domain.members[0];
    log("Domain error.  Url: " + request.originalUrl + ", RemoteAddress: " + request.connection.remoteAddress );
    log("Domain error message: " + ( error.message || "") );
    log( "Domain error stack: " + error.stack );

    server.kill( domain.members[0], domain.members[1], error );
}

var requestOnClose = function (request, response) {
    var server = this;
    log( "Request connection lost.  Url: " + request.originalUrl + ", RemoteAddress: " + request.connection.remoteAddress, "" );
    if ( request.timeout ) { clearTimeout( request.timeout ) }   //clears timeout on request that will kill long running requests
    request.domain.exit( );
};

module.exports = new Server( );
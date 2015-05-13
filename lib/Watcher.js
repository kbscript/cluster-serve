var fs = require( 'fs' );
var util = require( 'util' );
var resolve = require( 'path' ).resolve;
var join = require( 'path' ).join;

var Watcher = module.exports = function ( path, callback, options ) {
    var watcher = this; 
    if ( typeof options !== "object" ) { options = {}; }
      
    if ( typeof options.recursive === "undefined" ) { options.recursive = true; }
    watcher.recursive = options.recursive;
    
    if ( typeof options.exclude === "function" ) { watcher.exclude = options.exclude; }
    if ( util.isArray( options.exclude ) ) { watcher.exclude = options.exclude; }
    watcher.exclude = watcher.exclude || [];
    
    var i;
    for ( i = 0; i < watcher.exclude.length; i++ ) {
        if ( watcher.exclude[i] instanceof RegExp ) { continue; }                

        watcher.exclude[i] = new RegExp( escape(watcher.exclude[i] ), "gi" )
    }
    
    watcher.watchList = [];
    
    //if no callback provided, then throw errors
    if ( typeof callback !== "function" ) { callback = function ( err ) { if ( err ) { throw new Error( err ); } }; }
    watcher.callback = callback;    

    fs.stat( path, watcher.load.bind(watcher, path) );
};

Watcher.prototype.watch = function ( path ) {
    var watcher = this;       

    fs.watch( path, watcher.callback );               
};

Watcher.prototype.excluded = function ( filename, stats ) {
    var watcher = this, i;
    
    for ( i = 0; i < watcher.exclude.length; i++ ) { 
        if ( watcher.exclude[i].test( filename )) { return true; }
    }

    return false;  
};

Watcher.prototype.load = function ( path, err, stats ) {
    var watcher = this;
       
    if ( err || watcher.excluded( path, stats ) ) { return; }

    watcher.watch( path, stats );
            
    if ( !watcher.recursive || !stats.isDirectory( ) ) { return; }    
    fs.readdir( path, function ( err, dir ) {
        if ( err ) { return; }
        
        var i, subpath;
        for ( i = 0; i < dir.length; i++ ) {
            subpath = join( path, dir[i] )
            fs.stat( subpath, function ( err, stats ) { 
                var subpath = this.subpath;
                if ( stats.isDirectory( ) ) { watcher.load( subpath, err, stats ); }   
            }.bind( {subpath: subpath}) );
        }
    } );  
};

var escape = function ( text ) {
    return text.replace( /[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&" );
};
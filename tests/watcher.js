var Path = require( 'path' );
var Watcher = require( '../lib/Watcher.js' );
var watcher = new Watcher( Path.resolve( "../cluster-serve"), callback, {exclude: [/(^|\\|\/)\./, "node_modules","obj"]} );

function callback( event, name ) {
    var watcher = this; 
    console.log( "Event: " + event + ", Name: " + name );
};
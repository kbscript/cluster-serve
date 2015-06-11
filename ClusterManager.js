var cluster = require( 'cluster' );
var fs = require( 'fs' );
var Path = require( 'path' );
var debug = false;
var remote = "";

var log = function ( msg, error ) {
    console.log( msg || error );
}

process.on( 'uncaughtException', function ( err ) {
    log( "" , err );
    log( "", err.stack );
} )

//enums
var Command = { exit: "exit", log: "log" };
var Status = { stopped: "stopped", running: "running", closing: "closing", build: "build" };

//start Cluster Manager
var ClusterManager = function () {
    var clustermanager = this;
    
    clustermanager.servers = [];
    clustermanager.args = []
    clustermanager.getArguments( );
    clustermanager.status = Status.stopped;
    clustermanager.buildTimeout = null;      

    debug = ( typeof ( clustermanager.argv( "debug" ) || clustermanager.argv( "--debug" ) || clustermanager.argv( "--debug-brk" ) ) != "undefined" );
    remote = clustermanager.argv( "remote" ) ? "remote" : "";
    
    cluster.setupMaster( { exec: Path.join(__dirname, "./app.js"), args: [], silent: false } );

    var Watcher = require( Path.join( __dirname, './lib/Watcher' ) );
    var watcher = new Watcher( Path.resolve( __dirname ), function () {
        log( "restarting from watcher. " );
        clustermanager.build( );
    }, { debug: debug } );
    
    setInterval( function () {
        clustermanager.keepAlive( );
    }, 5000 );

    clustermanager.build( );
};

ClusterManager.prototype.build = function () {
    var clustermanager = this, data;
    
    if ( clustermanager.status == Status.build ) { 
        if ( clustermanager.buildTimeout ) { clearTimeout( clustermanager.buildTimeout ); }
        clustermanager.buildTimeout = setTimeout( function ( clustermanager ) { clustermanager.build( ); }, 30000, clustermanager );

        return
    }
    
    clustermanager.status = Status.build;

    try {
        data = fs.readFileSync( Path.join( __dirname, './ClusterManager.json' ), { encoding: 'utf8', flag: 'r' } ).replace( "\ufeff", "" );
    }
    catch ( error ) {
        log("", "error getting ClusterManager.json.  Error: " + error );
    }
    
    var config = JSON.parse( String( data ) ) || {};    
    clustermanager.server_defs = config.servers || [];

    //kill all current servers
    var i, n, server, servers = clustermanager.servers, def, instances, cpus = require( 'os' ).cpus( ).length, debugPort = 5810;
    
    clustermanager.servers = [];
    for ( i = 0; i < servers.length; i++ ) {
        server = servers[i];
        if ( server.status == Status.running ) { server.sendKill( ); }
    }

    
    //start a server for each core     
    for ( n = 0; n < clustermanager.server_defs.length; ++n ) {
        def = clustermanager.server_defs[n];        
        if ( !def.enabled ) { continue; }

        if ( def.ssl === false ) { delete def.ssl }
               
        instances = def.instances || cpus;        
        for ( i = 0; i < instances; i++ ) { 
            server = new Server( { debugPort: debugPort + i, id: i, env: extend( {wid: i}, def) } );
            clustermanager.servers[i] =  server;
            setTimeout( function ( server ) {
                worker( server );
                var totalServers = clustermanager.servers.length - 1;
                if ( server.id == totalServers ) { clustermanager.status = Status.running }
            }, 5000 * (i + 1), server );
        }
    }    
};

ClusterManager.prototype.keepAlive = function () {
    var clustermanager = this, i, server, uptime, closing = false;
    
    for ( i = 0; i < clustermanager.servers.length; i++ ) {
        server = clustermanager.servers[i];

        //if ( server.worker ) { log( "Active Server: " + server.id + ", Worker: " + server.worker.process.pid ); }

        if (!closing && server.maxtime && server.status == Status.running ) {
            uptime = new Date( ).getTime( ) - server.starttime;
            if ( uptime > server.maxtime ) {
                log( "Maxtime Restart process: " + server.worker.process.pid );
                server.sendKill( );
                closing = true;               
            }
        }//end if maxtime && status == running
        
        if ( server.status == Status.stopped ) {
            log( "Restarting server from 'keepAlive'." + " Worker: " + server.id );
            worker( server );
        }
    }//end for loop
    
};

ClusterManager.prototype.getArguments = function () {
    var clustermanager = this;
    
    var i, aArg, arg;
    for ( i = 0; i < process.argv.length; i++ ) {
        aArg = process.argv[i].split( "=" )
        arg = {};
        arg[aArg[0]] = aArg[1] || true;
        clustermanager.args.push( arg );
    }
    
    for ( i = 0; i < process.execArgv.length; i++ ) {
        aArg = process.execArgv[i].split( "=" )
        arg = {};
        arg[aArg[0]] = aArg[1] || true;
        clustermanager.args.push( arg );
    }

};

ClusterManager.prototype.argv = function (name) {
    var clustermanager = this;
    var arg, i;
    for ( i = 0; i < clustermanager.args.length; i++ ) {
        if ( typeof clustermanager.args[i][name] != "undefined" ) { return clustermanager.args[i][name] }
    }
};

var worker = function ( server ) {
    var startTime = new Date( ).getTime( );
    
    //lets check if the server has been started before - and get the seconds from last start attempt.  Need to keep it from continuously restarting 
    if ( server.starttime ) {
        if ( startTime - server.starttime / 1000 < 30 ) { return }
    }
    
    var argv = cluster.settings.execArgv;
    if ( debug || server.env.debug ) { cluster.settings.execArgv = ["--debug=" + server.debugPort] }
    
    var env
    try {         
        server.worker = cluster.fork( server.env );
        server.worker.on( 'disconnect', server.onExit );        
        server.worker.on( 'error', server.onExit );

        server.worker.server = server;
        server.starttime = startTime;
        server.status = Status.running;
    } 
    catch ( error ) { 
        //log error and set server.status to stopped so keepalive will handle restart
        log( "", error );
        server.status = Status.stopped;
    }
    
    cluster.settings.execArgv = argv;
    
    
}

var Server = function ( options ) {
    var server = this;
    
    server.killtimer = options.killtimer;
    server.maxtime = options.env.maxtime || 300000;  //mil of time that the servers should run before restarting
    server.killTimeout = options.env.killtime || 30000; // mil of time to wait for server to exit before we close it from the ClusterManager
    server.debugPort = options.debugPort;
    server.id = options.id;
       
    server.env = options.env; // {hostname: "localhost", port: 3001, ssl: true}   
};

Server.prototype.sendKill = function () {
    var server = this;
    server.status = Status.closing;
    try {
        server.worker.send( Command.exit );
        log( "Sending exit command to worker: " + server.id + ". Process: " + server.worker.process.pid );
    } catch ( error ) { 
        log("", "Error sending exit command to worker: " + server.id + ". Process: " + sever.worker.process.pid + ".  Error: " + error );
    }

    server.killtimer = setTimeout( function () {
        server.status = Status.stopped;
        if ( !server.worker ) { log("", "Error killing worker in killtimer." ); }
        if ( server.worker ) { log( "Killing worker: " + server.id + " in killtimer. Process: " + server.worker.process.pid ); server.worker.kill( ); }
    }, server.killTimeout );
};

Server.prototype.onExit = function () {
    var worker = this;
    if ( !worker.server ) { return; }
    
    var server = worker.server;

    delete worker.server;
    delete server.worker;

    server.status = Status.stopped;
    log( "Process " + worker.process.pid + " is dead :(" );
    if ( server.killtimer ) { clearTimeout( server.killtimer ); };
};

var extend = function ( child, parent ) {
    var key, __hasProp = Object.hasOwnProperty;
    for ( key in parent ) {
        if ( __hasProp.call( parent, key ) ) { child[key] = parent[key]; }
    }

    return child;
}

module.exports = new ClusterManager( );
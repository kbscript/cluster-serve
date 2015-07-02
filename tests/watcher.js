var Path = require( 'path' );
var Watcher = require( '../lib/Watcher.js' );
var assert = require('assert');
var util = require('util');
var fs = require('fs');

describe('Start new recursive Watcher', function () {
    var watcher, options = {exclude: [/(^|\\|\/)\./, "node_modules","obj"]};
    it('Load watcher and check properties.', function (done) {

        watcher = new Watcher( Path.join(__dirname, "/watch-test"), function () {},options) ;

        watcher.done = function () {
            assert.deepEqual(watcher.watchList,[Path.join(__dirname,'watch-test'), Path.join(__dirname,'/watch-test/watch-sub')], "Should be watching watch-test and watch-sub.");

            assert.ok(util.isArray(watcher.exclude), "watcher.excluded should be an array of RegExp");
            var _exclude = [/(^|\\|\/)\./,/node_modules/gi, /obj/gi];
            for (var i=0; i < watcher.exclude.length; i++) {
                assert.ok(
                watcher.exclude[i].source === _exclude[i].source &&
                watcher.exclude[i].global === _exclude[i].global &&
                watcher.exclude[i].multiline === _exclude[i].multiline &&
                watcher.exclude[i].ignoreCase === _exclude[i].ignoreCase
                ,"watcher.exclude[" + i + "] '" + watcher.exclude[i] + "' doesn't match " + _exclude[i]);
            }
            assert.ok(watcher.recursive === true,"watcher.recursive should default to true.");

            done();
        };
    });

    it('Should get callback on changed file', function  (done) {
        var timeout;
        var callback = function ( event, name ) {
            clearTimeout(timeout);

            if (done) {done(); done = undefined;}
        };

        watcher = new Watcher( Path.join(__dirname, "/watch-test"), callback ,options) ;

        fs.writeFile(Path.join(__dirname, '/watch-test/existing-file.txt'), 'Hello World!', function(err){
            if (err) {throw new Error(err);}
            //wait for file change event but call this
            timeout = setTimeout(function() {
                throw new Error("No watch event called after file change to /watch-test/existing-file.txt");
            }, 100);
        })
    });

    it('Should not get changed file event.', function  (done) {
        var timeout;
        var callback = function ( event, name ) {
            clearTimeout(timeout);
            throw new Error("Watch event called on wrong file: '/watch-test/.NotWatched/NotWatched.txt");
        };

        watcher = new Watcher( Path.join(__dirname, "/watch-test"), callback ,options) ;

        fs.writeFile(Path.join(__dirname, '/watch-test/.NotWatched/NotWatched.txt'), 'Hello World!', function(err){
            if (err) {throw new Error(err);}
            //wait for file change event but call this
            timeout = setTimeout(function() {
                if (done) {done(); done = undefined;}
            }, 100);
        });
    });

});
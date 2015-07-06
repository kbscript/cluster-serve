var assert = require('assert');
var request = require('supertest');
var path = require('path');

var express = require('express');
var Router = require('../lib/Router.js');
var router, app = express();

describe("Create new router", function () {

    before("setup new router",function(){
        router = new Router({root:path.join(__dirname,"./routes"), exclude: ["private", /(^|\\|\/)\./]}, function (error) {
            if (error) { throw error}
        });

        app.use(router.handler.bind(router));
        app.use(function (request, response) {
            response.status(404).send("not found").end();
        })
    });

    it("has and array of routes", function (done) {
        var routes = [
            path.join(__dirname, "./routes/index.js"),
            path.join(__dirname,"./routes/admin/index.js"),
            path.join(__dirname, "./routes/user/index.js")
        ];

        assert.deepEqual(router.routes, routes, "invalid routes." );

        done();
    });

    describe("Request to admin route", function () {
        it("Returns 200 status code", function (done) {
            request(app).get("/admin").expect(200).end(function (err) {
                if (err){throw err;}

                done();
            });
        });

        it("Returns 200 status code", function (done) {
            request(app).get("/admin/index").expect(200).end(function (err) {
                if (err){throw err;}

                done();
            });
        });

        it("Returns 404 status code", function (done) {
            request(app).get("/admin/admin.js").expect(404).end(function (err) {
                if (err){throw err;}

                done();
            });
        })
    });

    describe("Request to .hidden route", function () {
        it("should return 404", function (done) {
            request(app).get("/hidden").expect(404).end(function (err) {
                if (err){throw err;}

                done();
            });
        });

        it("should return 404", function (done) {
            request(app).get("/.hidden").expect(404).end(function (err) {
                if (err){throw err;}

                done();
            });
        });
    });

    describe("Request to private route", function () {
        it("should return 404", function (done) {
            request(app).get("/private").expect(404).end(function (err) {
                if (err){throw err;}

                done();
            });
        });
    });

});




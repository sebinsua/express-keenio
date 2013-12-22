var express    = require('express'),
    request    = require('supertest'),
    should     = require('chai').should(),
    sinon      = require('sinon'),
    proxyquire = require('proxyquire');

var mockKeenClientModule = {

  configure: function (options) {
    return {
      makeRequest: undefined,
      addEvent: function (eventCollection, event, callback) {
        if (this.makeRequest) {
          this.makeRequest(eventCollection, event, callback);
        }
      }
    }; 
  }

};

var keenioMiddleware = proxyquire('../lib/keenio-middleware', { "keen.io": mockKeenClientModule });

// @todo: Update the README.md.
// @todo: Before I release, take a look at some node.js projects I know about and see how it would be used with them.
//        Also take a look at something like this for ideas on interface: https://segment.io/libraries/node
//        Are we really dealing with events? Yes.
//        Should event be human-readable? Yes. Thus tagged.
//        Were properties a intent-react generalisation? Yes.

describe("keenioMiddleware", function () {
  
  describe("configure()", function () {
    // @todo: Look into some way of validating arguments in JavaScript. Nice way of doing so.

    /*
    it("should error if no configuration is passed in", function () {
      true.should.be.false;
    });

    it("should error if bad configuration is passed in", function () {
      // @todo: How to configure? Can I have modes and request-responses?
      true.should.be.false;
    });

    it("should return a valid middleware if handle() is executed after valid configuration", function () {
      // @todo: How to configure? Can I have modes and request-responses?
      // @todo: Way of tagging event collection + and replacing event collection name with better name.
      true.should.be.false;
    });

    it("should return a valid middleware if handleAll() is executed after valid configuration", function () {
      // @todo: How to configure? Can I have modes and request-responses?
      // @todo: Way of tagging event collection + and replacing event collection name with better name.
      true.should.be.false;
    });

    it("should error if handle() is executed before calling configure()", function () {
      true.should.be.false;
    });

    it("should error if handleAll() is executed before calling configure()", function () {
      true.should.be.false;
    });
    */

  });

  describe("identify()", function () {
    // @todo: Describe identify. Can I detect which user is logged in (and store this in a key-value)?
    //        Use the word 'track' in some places.

    /*
    it("should be able to get out data from req.user if this has been set", function () {

    });

    it("should be able to fallback to getting data from a session/header variable if user was not set", function () {

    });
    */

  });

  describe("handleAll() - all preconfigured routes", function () {
    var app;

    beforeEach(function () {
      keenioMiddleware.configure({
        projectId: "<fake-project-id>",
        writeKey: "<fake-write-key>"
      });

      app = express();
      app.configure(function () {
        app.use(express.bodyParser());
        app.use(keenioMiddleware.handle());
        app.use(app.router);
      });

      app.post('/test', function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });
    });

    // @todo: Sensible defaults for names, params, queries, key-values, etc.

    it("should send valid event data to keen.io on making a json body request", function (done) {
      keenioMiddleware.keenClient.makeRequest = function testRequestData (eventCollection, event) {
        eventCollection.should.equal("api--test");
        event.should.have.property('intention');
        event.intention.should.eql({
          path: '/test',
          query: {},
          body: {
            user: "seb"
          }
        });
      };

      request(app).post('/test')
                  .send({ "user": "seb" })
                  .expect('{\n  "user": "seb"\n}', done);
    });
    
    /*  
    it("should send valid event data to keen.io on making a params request", function (done) {
      true.should.be.false;
    });

    it("should send valid event data to keen.io on making a query request", function (done) {
      true.should.be.false;
    });

    it("should track a user if they could be identified from a request", function (done) {
      true.should.be.false;
    });

    it("should send no reaction to keen.io if application/json is not specified as the response", function (done) {
      // @todo: Handle json response. Handle non-json response.
      true.should.be.false;
    });

    it("should send a reaction to keen.io if application/json is specified as the response", function (done) {
      // @todo: Handle json response. Handle non-json response.
      true.should.be.false;
    });

    it("should not send header data to keen.io by default", function (done) {
      true.should.be.false;
    });

    it("should send header data to keen.io if the configuration mandated this", function (done) {
      true.should.be.false;
    });

    it("should ignore events that are explicity denied in the configuration", function (done) {
      true.should.be.false;
    });

    it("should allow you to set the eventCollectionName for a route from the configuration", function (done) {
      true.should.be.false;
    });

    it("should allow you to tag the event for a route from the configuration", function (done) {
      true.should.be.false;
    });
    */

  });

  describe("handle() - specific route", function () {
    var app;

    beforeEach(function () {
      keenioMiddleware.configure({
        projectId: "<fake-project-id>",
        writeKey: "<fake-write-key>"
      });

      app = express();
      app.configure(function () {
        app.use(express.bodyParser());
        app.use(app.router);
      });

      app.post('/test', function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });
    });

    // @todo: Decorator-style version should be able to be used instead of the general middleware version.

    /*
    it("should send valid event data to keen.io on making a json body request", function (done) {
      keenioMiddleware.keenClient.makeRequest = function testRequestData (eventCollection, event) {
        eventCollection.should.equal("api--test");
        event.should.have.property('intention');
        event.intention.should.eql({
          path: '/test',
          query: {},
          body: {
            user: "seb"
          }
        });
      };

      request(app).post('/test')
                  .send({ "user": "seb" })
                  .expect('{\n  "user": "seb"\n}', done);
    });
    
    it("should send valid event data to keen.io on making a params request", function (done) {
      true.should.be.false;
    });

    it("should send valid event data to keen.io on making a query request", function (done) {
      true.should.be.false;
    });

    it("should track a user if they could be identified from a request", function (done) {
      true.should.be.false;
    });

    it("should send no reaction to keen.io if application/json is not specified as the response", function (done) {
      // @todo: Handle json response. Handle non-json response.
      true.should.be.false;
    });

    it("should send a reaction to keen.io if application/json is specified as the response", function (done) {
      // @todo: Handle json response. Handle non-json response.
      true.should.be.false;
    });

    it("should allow you to set the eventCollectionName with the first argument", function (done) {
      true.should.be.false;
    });

    it("should allow you to tag the event with the second argument", function (done) {
      true.should.be.false;
    });    
    */
  });

});
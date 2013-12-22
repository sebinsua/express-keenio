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
        // Overriding this method stops the unit tests from hitting keen.io.
        // Note: a defined this.makeRequest allows us to execute some assertions from the unit tests.
        if (this.makeRequest) {
          this.makeRequest(eventCollection, event, callback);
        }
      }
    }; 
  }

};

// @todo: Update the README.md.
// @todo: Before I release, take a look at some node.js projects I know about and see how it would be used with them.
//        Are we really dealing with events? Yes.
//        Should event be human-readable? Yes. Thus tagged.
//        Were properties a intent-react generalisation? Yes.

describe("keenioMiddleware", function () {
  
  var keenioMiddleware;
  beforeEach(function () {
    keenioMiddleware = proxyquire('../lib/keenio-middleware', { "keen.io": mockKeenClientModule });
  });

  describe("configure()", function () {

    it("should error if no/bad configuration is passed in", function () {
      // Test the client configuration.
      var tests = [
        {
          configuration: null,
          errorMessage: "No options specified for the keen.io middleware."
        },
        {
          configuration: {},
          errorMessage: "No client options specified for the keen.io middleware."
        },
        {
          configuration: {
            client: {
              notProjectId: '<test>',
              writeKey: '<test>'
            }
          },
          errorMessage: "projectId is missing from the client options passed into the keen.io middleware and was mandatory."
        },
        {
          configuration: {
            client: {
              projectId: '<test>',
              notWriteKey: '<test>'
            }
          },
          errorMessage: "writeKey is missing from the client options passed into the keen.io middleware and was mandatory."
        }
      ];

      tests.forEach(function (test) {
        (function () {
          var configure = keenioMiddleware.configure.bind(keenioMiddleware);
          configure(test.configuration);
        }).should.throw(Error, test.errorMessage);
      });
    });

    it("should return a valid middleware if handle() is executed after valid configuration", function () {
      // @todo: How to configure? Can I have modes and request-responses?
      // @todo: Way of tagging event collection + and replacing event collection name with better name.
      var configuration = {
        client: {
          projectId: '<test>',
          writeKey: '<test>'
        }
      };

      var configure = keenioMiddleware.configure.bind(keenioMiddleware);
      (function () {
        configure(configuration);
      }).should.not.throw(Error);
      keenioMiddleware.options.should.eql(configuration);

      var handle = keenioMiddleware.handle.bind(keenioMiddleware);
      handle.should.not.throw(Error, "Middleware must be configured before use.");
    });
    
    it("should return a valid middleware if handleAll() is executed after valid configuration", function () {
      // @todo: How to configure? Can I have modes and request-responses?
      // @todo: Way of tagging event collection + and replacing event collection name with better name.
      var configuration = {
        client: {
          projectId: '<test>',
          writeKey: '<test>'
        }
      };

      var configure = keenioMiddleware.configure.bind(keenioMiddleware);
      (function () {
        configure(configuration);
      }).should.not.throw(Error);
      keenioMiddleware.options.should.eql(configuration);

      var handleAll = keenioMiddleware.handleAll.bind(keenioMiddleware);
      handleAll.should.not.throw(Error, "Middleware must be configured before use.");
    });

    it("should error if handle() is executed before calling configure()", function () {
      var handle = keenioMiddleware.handle.bind(keenioMiddleware);
      handle.should.throw(Error, "Middleware must be configured before use.");
    });

    it("should error if handleAll() is executed before calling configure()", function () {
      var handleAll = keenioMiddleware.handleAll.bind(keenioMiddleware);
      handleAll.should.throw(Error, "Middleware must be configured before use.");
    });

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
        client: {
          projectId: "<fake-project-id>",
          writeKey: "<fake-write-key>"
        }
      });

      app = express();
      app.configure(function () {
        app.use(express.bodyParser());
        app.use(keenioMiddleware.handleAll());
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

  describe("handle(eventCollection, eventTag) - specific route", function () {
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
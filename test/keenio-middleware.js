var express    = require('express'),
    request    = require('supertest'),
    should     = require('chai').should(),
    sinon      = require('sinon'),
    proxyquire = require('proxyquire');

var mockKeenClientModule = {

  configure: function (options) {
    return {
      addEvent: function (eventCollection, event, callback) {}
    }; 
  }

};

// @todo: Update the README.md.
/*
{
  client: {
    notProjectId: '<test>',
    writeKey: '<test>'
  },
  defaults: {
    generateIdentity: function (req) {},
    generateEventCollectionName: function (route) {},
    // new...
    parseRequestBody: function (body) {},
    parseResponseBody: function (body) {}
  },
  excludeRoutes: [
    { method: 'GET', route: 'route-name' }
  ],
  routes: [
    { method: 'GET', route: 'route-name-1', eventCollectionName: '', tag: '' },
    { method: 'POST', route: 'route-name-2', eventCollectionName: '', tag: '' }
  ],
}
*/
// @todo: Create a small node.js project that uses this to help manually sanity test.
// @todo: Find out what keen.io does if it receives an array...?!
// ---
// REFACTOR:
// @todo: Find out why the is("json") thing has to be used... Can we do this at another point?
// @todo: Write some code to ensure that handleAll config gets overridden by individual middleware functions and not the other way around.
// @todo: Abstract: Handler, Identify, Request, Response parser.

describe("keenioMiddleware", function () {
  
  var keenioMiddleware;
  beforeEach(function () {
    keenioMiddleware = proxyquire('../lib/keenio-middleware', { "keen.io": mockKeenClientModule });
  });

  describe("configure()", function () {

    it("should error if invalid configuration was passed in", function () {
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

    it("should error if both routes and excludeRoutes are passed in", function () {
      var configuration = {
        client: {
          projectId: '<test>',
          writeKey: '<test>'
        },
        excludeRoutes: [],
        routes: []
      };

      (function () {
        var configure = keenioMiddleware.configure.bind(keenioMiddleware);
        configure(configuration);
      }).should.throw(Error, "You must only specify routes or excludeRoutes, never both.");
    });

    it("should not error if only routes or excludeRoutes was passed in", function () {
      var tests = [{
        client: {
          projectId: '<test>',
          writeKey: '<test>'
        },
        routes: []
      }, {
        client: {
          projectId: '<test>',
          writeKey: '<test>'
        },
        excludeRoutes: []
      }];

      tests.forEach(function (configuration) {
        (function () {
          var configure = keenioMiddleware.configure.bind(keenioMiddleware);
          configure(configuration);
        }).should.not.throw(Error, "You must only specify routes or excludeRoutes, never both.");
      });
    });

    it("should return a valid middleware if handle() is executed after valid configuration", function () {
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

  describe("_getResponseData()", function () {
    it("should support a single numeric argument", function () {
      keenioMiddleware._getResponseData([ 201 ]).should.eql({ status: 201 });
    });

    it("should support a single string argument", function () {
      keenioMiddleware._getResponseData([ 'hello world' ]).should.eql({ status: 200, reaction: 'hello world' });
    });

    it("should support a single json string argument", function () {
      keenioMiddleware._getResponseData([ '{ "special": "text" }' ]).should.eql({ status: 200, reaction: { special: "text" } });
    });

    it("should support a single json object argument", function () {
      keenioMiddleware._getResponseData([ { "special": "text" } ]).should.eql({ status: 200, reaction: { special: "text" } });
    });

    it("should support two arguments", function () {
      keenioMiddleware._getResponseData([ 404, { "error": "message" } ]).should.eql({ status: 404, reaction: { error: "message" } });
    });

  });

  describe("_sanitizeBody()", function () {
    it("should wipe out the value inside a 'password' key", function () {
      var inputData = {
        password: 'abc123'
      }, outputData = {
        password: '[redacted]'
      };
      keenioMiddleware._sanitizeBody(inputData).should.eql(outputData);
    });
  });

  describe("_isExcludedRoute()", function () {
    var configuration = {
      client: {
        projectId: '<test>',
        writeKey: '<test>'
      },
      excludeRoutes: [
        { route: "/other-route", method: "post" },
        { route: "/test", method: "get" },
        { route: "/test", method: "post" }
      ],
    };

    it("should return true if a route is in the excluded list", function () {
      var route = {
        path: "/test",
        method: "get"
      };

      keenioMiddleware.configure(configuration);
      keenioMiddleware._isExcludedRoute(route).should.be.true;
    });

    it("should return false if a route is not in the excluded list", function () {
      var route = {
        path: "/test",
        method: "options"
      };

      keenioMiddleware.configure(configuration);
      keenioMiddleware._isExcludedRoute(route).should.be.false;
    });
  });

  describe("_getEventCollectionMetadataForRoute()", function () {
    var configuration = {
      client: {
        projectId: '<test>',
        writeKey: '<test>'
      },
      routes: [
        { route: "/other-route", method: "post" },
        { route: "/test", method: "get", eventCollectionName: "specialEventCollectionName" },
        { route: "/test", method: "post", tag: "specialTag" }
      ],
    };

    it("should just return undefined if there was nothing relevant in the configuration", function () {
      var route = {
        path: "/test",
        method: "options"
      };

      keenioMiddleware.configure(configuration);
      var metadata = keenioMiddleware._getEventCollectionMetadataForRoute(route);
      metadata.should.be.false;
    });

    it("should return valid data if the route matched with one that had metadata", function () {
      var metadata, route_a = {
        path: "/test",
        method: "get"
      }, route_b = {
        path: "/other-route",
        method: "post"
      };

      keenioMiddleware.configure(configuration);
      metadata = keenioMiddleware._getEventCollectionMetadataForRoute(route_a);
      metadata.should.eql({ eventCollectionName: "specialEventCollectionName" });

      metadata = keenioMiddleware._getEventCollectionMetadataForRoute(route_b);
      metadata.should.eql({});
    });
  });

  describe("identify()", function () {

    it("should be able to get out data from req.user if this has been set", function () {
      var req = {
        user: {
          id: 'abc123'
        }
      };

      keenioMiddleware.identify(req).should.eql({ id: 'abc123' });
    });

    it("should be able to fallback to getting data from a session variable if user was not set", function () {
      var req = {
        session: {
          id: 'abc123'
        }
      };

      keenioMiddleware.identify(req).should.eql({ id: 'abc123' });
    });

    it("should be able to fallback to empty data even if header data was sent", function () {
      var req = {
        headers: {
          'Session-Id': '<fake-session>',
          'User-Agent': 'libwww/4.1'
        }
      };

      keenioMiddleware.identify(req).should.eql({});
    });

    it("should be able to have the identifier overridden to store any kind of identity", function () {
      var req = {
        headers: {
          'Client-Api-Key': 'abc123',
          'User-Agent': 'libwww/4.1'
        }
      };

      keenioMiddleware.options = {
        defaults: {
          generateIdentity: function (req) {
            return req.headers['Client-Api-Key'];
          }
        }
      };

      keenioMiddleware.identify(req).should.eql('abc123');
      keenioMiddleware.options.defaults.identifier = null;
    });

  });

  describe("handleAll() - default routes", function () {
    var app;

    beforeEach(function () {
      keenioMiddleware.configure({
        client: {
          projectId: "<fake-project-id>",
          writeKey: "<fake-write-key>"
        },
        excludeRoutes: [
          { route: '/disabled-insecure-route', method: 'get' }
        ]
      });

      app = express();
      app.configure(function () {
        app.use(express.json());
        app.use(express.urlencoded()); // note: these two replace: app.use(express.bodyParser());
                                       // see:  http://stackoverflow.com/questions/19581146/how-to-get-rid-of-connect-3-0-deprecation-alert
        app.use(keenioMiddleware.handleAll());        
        app.use(app.router);   
      });

      app.post('/test', function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });
      app.post('/params/:userId/:someParam/:someOtherParam', function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });
      app.get('/disabled-insecure-route', function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });
    });

    it("should send valid event data to keen.io on making a json body request", function (done) {
      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).post('/test')
                  .send({ "user": "seb" })
                  .expect('{\n  "user": "seb"\n}', function () {

                    var callArgs, eventCollection, event;
                    callArgs = testRequest.getCall(0).args;
                    eventCollection = callArgs[0];
                    event = callArgs[1];

                    eventCollection.should.equal("post-test");
                    event.should.have.property('intention');
                    event.intention.should.eql({
                      path: '/test',
                      query: {},
                      body: {
                        user: "seb"
                      },
                      params: {}
                    });
                    event.reaction.should.eql({ user: "seb" });

                    done();
                  });
    });
    
    it("should send valid event data to keen.io on making a params request", function (done) {
      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).post('/params/5/7/8')
                  .send({ "user": "seb" })
                  .expect('{\n  "user": "seb"\n}', function () {
                    
                    var callArgs, eventCollection, event;
                    callArgs = testRequest.getCall(0).args;
                    eventCollection = callArgs[0];
                    event = callArgs[1];

                    eventCollection.should.equal("post-params-userId-someParam-someOtherParam");
                    event.should.have.property('intention');
                    event.intention.should.eql({
                      path: '/params/5/7/8',
                      body: {
                        user: "seb"
                      },
                      query: {},
                      params: { userId: '5', someParam: '7', someOtherParam: '8' }
                    });
                    event.should.have.property("reaction");
                    event.reaction.should.eql({
                      user: "seb"
                    });

                    done();
                  });
    });

    it("should send valid event data to keen.io on making a query request", function (done) {
      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).post('/test?someArgument=2&anotherArgument=4')
                  .send({ "user": "seb" })
                  .expect('{\n  "user": "seb"\n}', function () {
                    
                    var callArgs, eventCollection, event;
                    callArgs = testRequest.getCall(0).args;
                    eventCollection = callArgs[0];
                    event = callArgs[1];

                    eventCollection.should.equal("post-test");
                    event.should.have.property('intention');
                    event.intention.should.eql({
                      path: '/test',
                      query: {
                        someArgument: '2',
                        anotherArgument: '4'
                      },
                      body: {
                        user: "seb"
                      },
                      params: {}
                    });
                    event.should.have.property("reaction");
                    event.reaction.should.eql({
                      user: "seb"
                    });

                    done();
                  });
    });

    it("should track a user if they could be identified from a request", function (done) {
      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).post('/test')
                  .send({ "user": "seb" })
                  .expect('{\n  "user": "seb"\n}', function () {
                    var event = testRequest.getCall(0).args[1];

                    // event.identity.should.eql();

                    done();
                  });
    });

    it("should send no reaction to keen.io if application/json is not specified as the response", function (done) {
      var makeRequest = sinon.spy();
      keenioMiddleware.keenClient.makeRequest = makeRequest;

      request(app).post('/test')
                  .send('{ "user": "seb" }')
                  .expect('{\n  "user": "seb"\n}', function () {
                    makeRequest.calledOnce.should.equal(false);
                    done();
                  });
    });

    it("should send a reaction to keen.io if application/json is specified as the response", function (done) {
      var makeRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = makeRequest;

      request(app).post('/test')
                  .send({ "user": "seb" })
                  .expect('{\n  "user": "seb"\n}', function () {
                    makeRequest.calledOnce.should.be.true;
                    done();
                  });
    });

    it("should not send identity data to keen.io by default", function (done) {
      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).post('/test')
                  .send({ "user": "seb" })
                  .expect('{\n  "user": "seb"\n}', function () {
                    var callArgs, event;
                    callArgs = testRequest.getCall(0).args;
                    event = callArgs[1];                    

                    should.not.exist(event.identity);
                    done();
                  });
    });
    
    it("should ignore events that are explicity denied in the configuration", function (done) {
      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).get('/disabled-insecure-route')
                  .send({ "user": "seb" })
                  .expect('{\n  "user": "seb"\n}', function () {
                    testRequest.calledOnce.should.be.false;
                    done();
                  });
    });

  });

  describe("handleAll() - preconfigured routes + altered defaults", function () {
    var app;

    beforeEach(function () {
      keenioMiddleware.configure({
        client: {
          projectId: "<fake-project-id>",
          writeKey: "<fake-write-key>"
        },
        defaults: {
          generateIdentity: function (req) { return { test: "lies all lies - see later test" } }
        },
        routes: [
          { route: '/params/:userId/:someParam/:someOtherParam', method: 'post', eventCollectionName: "testEventCollectionName" },
          { route: '/test', method: 'get', tag: "testTagName" }  
        ]
      });

      app = express();
      app.configure(function () {
        app.use(express.json());
        app.use(express.urlencoded()); // note: these two replace: app.use(express.bodyParser());
                                       // see:  http://stackoverflow.com/questions/19581146/how-to-get-rid-of-connect-3-0-deprecation-alert
        app.use(keenioMiddleware.handleAll());        
        app.use(app.router);   
      });

      app.get('/test', function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });
      app.post('/test', function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });
      app.post('/params/:userId/:someParam/:someOtherParam', function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });
    });

    it("should no longer pick up events from routes not defined in the routes configuration", function (done) {
      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).post('/test')
                  .send({ "user": "seb" })
                  .expect('{\n  "user": "seb"\n}', function () {
                    testRequest.calledOnce.should.be.false;
                    done();
                  });
    });

    it("should allow you to set the eventCollectionName for a route from the configuration", function (done) {
      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).post('/params/5/6/7')
                  .send({ "user": "seb" })
                  .expect('{\n  "user": "seb"\n}', function () {
                    var callArgs, eventCollectionName;
                    callArgs = testRequest.getCall(0).args;
                    eventCollectionName = callArgs[0];                

                    eventCollectionName.should.equal("testEventCollectionName");
                    done();
                  });
    });

    it("should allow you to tag the event for a route from the configuration", function (done) {
      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).get('/test')
                  .send({ "user": "seb" })
                  .expect('{\n  "user": "seb"\n}', function () {
                    var callArgs, event;
                    callArgs = testRequest.getCall(0).args;
                    event = callArgs[1];                

                    event.tag.should.equal("testTagName");
                    done();
                  });
    });

    it("should send specific identity data to keen.io if the configuration mandated this", function (done) {
      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).get('/test')
                  .send({ "user": "seb" })
                  .expect('{\n  "user": "seb"\n}', function () {
                    var callArgs, event;
                    callArgs = testRequest.getCall(0).args;
                    event = callArgs[1];                    

                    event.identity.should.eql({ "test": "lies all lies - see later test" });
                    done();
                  });
    });

  });

  describe("handle(eventCollection, eventTag) - specific route", function () {
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
        app.use(express.json());
        app.use(express.urlencoded()); // note: these two replace: app.use(express.bodyParser());
                                       // see:  http://stackoverflow.com/questions/19581146/how-to-get-rid-of-connect-3-0-deprecation-alert
        
        app.use(app.router);
      });
    });

    it("should send valid event data to keen.io on making a json body request", function (done) {
      app.post('/test', keenioMiddleware.handle('eventCollectionName', "Posted to test"), function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });      

      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).post('/test')
                  .send({ "user": "seb" })
                  .expect('{\n  "user": "seb"\n}', function () {
                    
                    var callArgs, eventCollection, event;
                    callArgs = testRequest.getCall(0).args;
                    eventCollection = callArgs[0];
                    event = callArgs[1];                    

                    eventCollection.should.equal("eventCollectionName");
                    event.tag.should.equal("Posted to test");
                    event.should.have.property('intention');
                    event.intention.should.eql({
                      path: '/test',
                      query: {},
                      body: {
                        user: "seb"
                      },
                      params: {}
                    });
                    event.should.have.property("reaction");
                    event.reaction.should.eql({
                      user: "seb"
                    });

                    done();
                  });
    });
    
    it("should send valid event data to keen.io on making a params request", function (done) {
      app.post('/params/:userId/:someParam/:someOtherParam', keenioMiddleware.handle(), function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });

      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).post('/params/5/7/8')
                  .send({ "user": "seb" })
                  .expect('{\n  "user": "seb"\n}', function () {
                    
                    var callArgs, eventCollection, event;
                    callArgs = testRequest.getCall(0).args;
                    eventCollection = callArgs[0];
                    event = callArgs[1];                    

                    eventCollection.should.equal("post-params-userId-someParam-someOtherParam");
                    event.should.have.property('intention');
                    event.intention.should.eql({
                      path: '/params/5/7/8',
                      query: {},
                      body: {
                        user: "seb"
                      },
                      params: { userId: '5', someParam: '7', someOtherParam: '8' }
                    });
                    event.should.have.property("reaction");
                    event.reaction.should.eql({
                      user: "seb"
                    });                    

                    done();
                  });
    });

    it("should send valid event data to keen.io on making a query request", function (done) {
      app.get('/test', keenioMiddleware.handle(), function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });
      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).get('/test?someArgument=2&anotherArgument=4')
                  .send({ "user": "seb" })
                  .expect('{\n  "user": "seb"\n}', function () {
                    
                    var callArgs, eventCollection, event;
                    callArgs = testRequest.getCall(0).args;
                    eventCollection = callArgs[0];
                    event = callArgs[1];                    

                    eventCollection.should.equal("get-test");
                    event.should.have.property('intention');
                    event.intention.should.eql({
                      path: '/test',
                      query: {
                        someArgument: '2',
                        anotherArgument: '4'
                      },
                      body: {
                        user: "seb"
                      },
                      params: {}
                    });
                    event.should.have.property("reaction");
                    event.reaction.should.eql({
                      user: "seb"
                    });

                    done();
                  });
    });
    
    it("should track a user if they could be identified from a request", function (done) {
      app.get('/test', keenioMiddleware.handle(), function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });

      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).get('/test')
                  .send({ "user": "seb" })
                  .expect('{\n  "user": "seb"\n}', function () {
                    var event = testRequest.getCall(0).args[1];

                    // event.identity.should.eql();

                    done();
                  });
    });

    it("should send no reaction to keen.io if application/json is not specified as the response", function (done) {
      app.get('/test', keenioMiddleware.handle(), function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });

      var makeRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = makeRequest;

      request(app).get('/test')
                  .send('{ "user": "seb" }')
                  .expect('{\n  "user": "seb"\n}', function () {
                    makeRequest.calledOnce.should.equal(false);
                    done();
                  });
    });

    it("should send a reaction to keen.io if application/json is specified as the response", function (done) {
      app.get('/test', keenioMiddleware.handle(), function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });

      var makeRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = makeRequest;

      request(app).get('/test')
                  .send({ "user": "seb" })
                  .expect('{\n  "user": "seb"\n}', function () {
                    makeRequest.calledOnce.should.equal(true);
                    done();
                  });
    });

    it("should allow you to set the eventCollectionName with the first argument", function (done) {
      app.post('/test', keenioMiddleware.handle('eventCollectionName'), function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });      

      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).post('/test')
                  .send({ "user": "seb" })
                  .expect('{\n  "user": "seb"\n}', function () {
                    var eventCollection = testRequest.getCall(0).args[0];

                    eventCollection.should.equal("eventCollectionName");

                    done();
                  });
    });

    it("should allow you to tag the event with the second argument", function (done) {
      app.post('/test', keenioMiddleware.handle(null, "Event tag"), function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });      

      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).post('/test')
                  .send({ "user": "seb" })
                  .expect('{\n  "user": "seb"\n}', function () {
                    var event = testRequest.getCall(0).args[1];

                    event.tag.should.equal("Event tag");

                    done();
                  });
    });
  });

});

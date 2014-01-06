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

// @todo: Fix these event identity things - they're too all-encompassing.
// @todo: How to configure? Can I have modes and request-responses? A new config format.
// @todo: Handle non-json response.
// @todo: Restructure the format of intention that we send to keen.io.

// @todo: Update the README.md.
// @todo: Before I release, take a look at some node.js projects I know about and see how it would be used with them.
//        Are we really dealing with events? Yes.
//        Should event be human-readable? Yes. Thus tagged.
//        Were properties a intent-react generalisation? Yes - but the meaning might not be clear.

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

  describe("_identify()", function () {

    it("should be able to get out data from req.user if this has been set", function () {
      var req = {
        user: {
          id: 'abc123'
        }
      };

      keenioMiddleware._identify(req).should.eql({ id: 'abc123' });
    });

    it("should be able to fallback to getting data from a session variable if user was not set", function () {
      var req = {
        session: {
          id: 'abc123'
        }
      };

      keenioMiddleware._identify(req).should.eql({ id: 'abc123' });
    });

    it("should be able to fallback to getting data from a header variable if user was not set", function () {
      var req = {
        headers: {
          'Session-Id': '<fake-session>',
          'User-Agent': 'libwww/4.1'
        }
      };

      keenioMiddleware._identify(req).should.eql({ 'Session-Id': '<fake-session>', 'User-Agent': 'libwww/4.1' });
    });

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

                    eventCollection.should.equal("api--test");
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

                    eventCollection.should.equal("api--params/5/7/8");
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

                    eventCollection.should.equal("api--test");
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
                    makeRequest.calledOnce.should.equal(true);
                    done();
                  });
    });

    /*
    it("should not send identity data to keen.io by default", function (done) {
      true.should.be.false;
    });

    it("should send specific identity data to keen.io if the configuration mandated this", function (done) {
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

                    eventCollection.should.equal("api--params/5/7/8");
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

                    eventCollection.should.equal("api--test");
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

"use strict";

var express = require('express'),
    request = require('supertest'),
    should = require('chai').should(),
    sinon = require('sinon'),
    proxyquire = require('proxyquire');

var mockKeenClientModule = {

  configure: function (options) {
    return {
      addEvent: function (eventCollection, event, callback) {}
    };
  }

};

describe("keenioMiddleware", function () {

  var keenioMiddleware;
  beforeEach(function () {
    keenioMiddleware = proxyquire('../lib/keenio-middleware', {
      "keen.io": mockKeenClientModule
    });
  });

  it('should inherit from EventEmitter', function (done) {
    keenioMiddleware.on('foo', done);
    keenioMiddleware.emit('foo');
  });

  describe("configure()", function () {

    it("should error if invalid configuration was passed in", function () {
      // Test the client configuration.
      var tests = [{
        configuration: null,
        errorMessage: "No options specified for the keen.io middleware."
      }, {
        configuration: {},
        errorMessage: "No client options specified for the keen.io middleware."
      }, {
        configuration: {
          client: {
            notProjectId: '<test>',
            writeKey: '<test>'
          }
        },
        errorMessage: "projectId is missing from the client options passed into the keen.io middleware and was mandatory."
      }, {
        configuration: {
          client: {
            projectId: '<test>',
            notWriteKey: '<test>'
          }
        },
        errorMessage: "writeKey is missing from the client options passed into the keen.io middleware and was mandatory."
      }, {
        configuration: 'here is my projectId (1) and writeKey (47)',
        errorMessage: "Configuration must be a valid object."
      }];

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

    it("should return a valid middleware if trackRoute() is executed after valid configuration", function () {
      var configuration = {
        client: {
          projectId: '<test>',
          writeKey: '<test>'
        }
      }, afterConfiguration = {
        client: {
          projectId: '<test>',
          writeKey: '<test>'
        },
        handlers: {},
        whitelistProperties: {},
        blacklistProperties: [],
        defaults: {
          MAX_PROPERTY_HIERARCHY_DEPTH: 10,
          MAX_STRING_LENGTH: 1000,
          MAX_PROPERTY_QUANTITY: 300,
          addons: {
            ipToGeo: true,
            userAgentParser: true
          },
          eventualSchemas: {
            cache: true,
            cachePath: './route-schemas.cache',
            query: {
              MAX_PROPERTIES: 30,
              NUMBER_OF_INSTANCES: 500,
              NUMBER_OF_DAYS: 7
            },
            body: {
              MAX_PROPERTIES: 80,
              NUMBER_OF_INSTANCES: 500,
              NUMBER_OF_DAYS: 7
            },
            reaction: {
              MAX_PROPERTIES: 120,
              NUMBER_OF_INSTANCES: 500,
              NUMBER_OF_DAYS: 7
            }
          }
        }
      };

      var configure = keenioMiddleware.configure.bind(keenioMiddleware);
      (function () {
        configure(configuration);
      }).should.not.throw(Error);
      keenioMiddleware.options.should.eql(afterConfiguration);

      var handle = keenioMiddleware.trackRoute.bind(keenioMiddleware);
      handle.should.not.throw(Error, 'express-keenio middleware must be configured before use. Please call ' +
                                     'keenio-middleware#configure(options).');
    });

    it("should return a valid middleware if handleAll() is executed after valid configuration", function () {
      var configuration = {
        client: {
          projectId: '<test>',
          writeKey: '<test>'
        }
      }, afterConfiguration = {
        client: {
          projectId: '<test>',
          writeKey: '<test>'
        },
        handlers: {},
        whitelistProperties: {},
        blacklistProperties: [],
        defaults: {
          MAX_PROPERTY_HIERARCHY_DEPTH: 10,
          MAX_STRING_LENGTH: 1000,
          MAX_PROPERTY_QUANTITY: 300,
          addons: {
            ipToGeo: true,
            userAgentParser: true
          },
          eventualSchemas: {
            cache: true,
            cachePath: './route-schemas.cache',
            query: {
              MAX_PROPERTIES: 30,
              NUMBER_OF_INSTANCES: 500,
              NUMBER_OF_DAYS: 7
            },
            body: {
              MAX_PROPERTIES: 80,
              NUMBER_OF_INSTANCES: 500,
              NUMBER_OF_DAYS: 7
            },
            reaction: {
              MAX_PROPERTIES: 120,
              NUMBER_OF_INSTANCES: 500,
              NUMBER_OF_DAYS: 7
            }
          }
        }
      };

      var configure = keenioMiddleware.configure.bind(keenioMiddleware);
      (function () {
        configure(configuration);
      }).should.not.throw(Error);
      keenioMiddleware.options.should.eql(afterConfiguration);

      var handleAll = keenioMiddleware.handleAll.bind(keenioMiddleware);
      handleAll.should.not.throw(Error, 'express-keenio middleware must be configured before use. Please call ' +
                                        'keenio-middleware#configure(options).');
    });

    it("should error if handle() is executed before calling configure()", function () {
      var handle = keenioMiddleware.handle.bind(keenioMiddleware);
      handle.should.throw(Error, 'express-keenio middleware must be configured before use. Please call ' +
                                 'keenio-middleware#configure(options).');
    });

    it("should error if handleAll() is executed before calling configure()", function () {
      var handleAll = keenioMiddleware.handleAll.bind(keenioMiddleware);
      handleAll.should.throw(Error, 'express-keenio middleware must be configured before use. Please call ' +
                                    'keenio-middleware#configure(options).');
    });

  });

  describe("handle() - default routes", function () {
    var app;

    beforeEach(function () {
      keenioMiddleware.configure({
        client: {
          projectId: "<fake-project-id>",
          writeKey: "<fake-write-key>"
        },
        excludeRoutes: [{
          route: '/disabled-insecure-route',
          method: 'GET'
        }]
      });

      app = express();
      app.configure(function () {
        app.use(express.json());
        app.use(express.urlencoded()); // note: these two replace: app.use(express.bodyParser());
        app.use(express.multipart());
        // see:  http://stackoverflow.com/questions/19581146/how-to-get-rid-of-connect-3-0-deprecation-alert
        app.use(express.cookieParser('S3CRE7'));
        app.use(express.session({ store: new express.session.MemoryStore, secret: 'S3CRE7', key: 'sid' }));        
        app.use(keenioMiddleware);
        app.use(app.router);
      });

      app.post('/test', function (req, res) {
        var requestBody = req.body;
        // console.log(requestBody);
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
        .send({
          "user": "seb"
        })
        .expect('{\n  "user": "seb"\n}', function () {

          var callArgs, eventCollection, event;
          callArgs = testRequest.called ? testRequest.getCall(0).args : null;
          if (!callArgs) {
            should.Throw("No request was ever made to Keen.IO");  
          }
          eventCollection = callArgs[0];
          event = callArgs[1];

          eventCollection.should.equal("post-test");
          event.should.have.property('intention');
          event.intention.should.eql({
            method: 'POST',
            path: '/test',
            query: {},
            body: {
              user: "seb"
            },
            params: {}
          });
          event.reaction.should.eql({
            user: "seb"
          });

          done();
        });
    });

    it("should send valid event data to keen.io on making a params request", function (done) {
      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).post('/params/5/7/8')
        .send({
          "user": "seb"
        })
        .expect('{\n  "user": "seb"\n}', function () {

          var callArgs, eventCollection, event;
          callArgs = testRequest.called ? testRequest.getCall(0).args : null;
          if (!callArgs) {
            should.Throw("No request was ever made to Keen.IO");  
          }
          eventCollection = callArgs[0];
          event = callArgs[1];

          eventCollection.should.equal("post-params-userId-someParam-someOtherParam");
          event.should.have.property('intention');
          event.intention.should.eql({
            method: 'POST',
            path: '/params/5/7/8',
            body: {
              user: "seb"
            },
            query: {},
            params: {
              userId: '5',
              someParam: '7',
              someOtherParam: '8'
            }
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
        .send({
          "user": "seb"
        })
        .expect('{\n  "user": "seb"\n}', function () {

          var callArgs, eventCollection, event;
          callArgs = testRequest.called ? testRequest.getCall(0).args : null;
          if (!callArgs) {
            should.Throw("No request was ever made to Keen.IO");  
          }
          eventCollection = callArgs[0];
          event = callArgs[1];

          eventCollection.should.equal("post-test");
          event.should.have.property('intention');
          event.intention.should.eql({
            method: 'POST',
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
        .set('Referer', 'http://www.google.co.uk')
        .send({
          "user": "seb"
        })
        .expect('{\n  "user": "seb"\n}', function () {
          var callArgs = testRequest.called ? testRequest.getCall(0).args : null;
          if (!callArgs) {
            should.Throw("No request was ever made to Keen.IO");  
          }
          var event = callArgs[1];

          event.intention.referer.should.eql('http://www.google.co.uk');
          should.exist(event.identity.session);

          done();
        });
    });

    it("should send a reaction to Keen.IO if application/json is specified as the response", function (done) {
      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).post('/test')
        .send({
          "value": "json"
        })
        .expect('{\n  "value": "json"\n}', function () {
          var callArgs, event;
          callArgs = testRequest.called ? testRequest.getCall(0).args : null;
          if (!callArgs) {
            should.Throw("No request was ever made to Keen.IO");  
          }
          event = callArgs[1];

          event.intention.body.should.eql({ "value": "json" });
          done();
        });
    });

    it("should send a reaction to Keen.IO if application/x-www-form-urlencoded is specified as the response", function (done) {
      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).post('/test')
        .type('form')
        .send('value=urlencoded')
        .expect('{\n  "value": "urlencoded"\n}', function () {
          var callArgs, event;
          callArgs = testRequest.called ? testRequest.getCall(0).args : null;
          if (!callArgs) {
            should.Throw("No request was ever made to Keen.IO");  
          }
          event = callArgs[1];

          event.intention.body.should.eql({ "value": "urlencoded" });
          done();
        });
    });

    it("should send empty identity data to keen.io by default", function (done) {
      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).post('/test')
        .send({
          "user": "seb"
        })
        .expect('{\n  "user": "seb"\n}', function () {
          var callArgs, event;
          callArgs = testRequest.called ? testRequest.getCall(0).args : null;
          if (!callArgs) {
            should.Throw("No request was ever made to Keen.IO");  
          }
          event = callArgs[1];

          should.exist(event.identity.session);
          done();
        });
    });

    it("should ignore events that are explicity denied in the configuration", function (done) {
      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).get('/disabled-insecure-route')
        .send({
          "user": "seb"
        })
        .expect('{\n  "user": "seb"\n}', function () {
          testRequest.calledOnce.should.be.false;
          done();
        });
    });

  });

  describe("handle() - preconfigured routes + altered handlers", function () {
    var app;

    beforeEach(function () {
      keenioMiddleware.configure({
        client: {
          projectId: "<fake-project-id>",
          writeKey: "<fake-write-key>"
        },
        handlers: {
          generateIdentity: function (req) {
            return {
              test: "lies all lies - see later test"
            }
          }
        },
        routes: [{
          route: '/params/:userId/:someParam/:someOtherParam',
          method: 'POST',
          eventCollectionName: "testEventCollectionName"
        }, {
          route: '/test',
          method: 'GET',
          tag: "testTagName"
        }]
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
        .send({
          "user": "seb"
        })
        .expect('{\n  "user": "seb"\n}', function () {
          testRequest.calledOnce.should.be.false;
          done();
        });
    });

    it("should allow you to set the eventCollectionName for a route from the configuration", function (done) {
      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).post('/params/5/6/7')
        .send({
          "user": "seb"
        })
        .expect('{\n  "user": "seb"\n}', function () {
          var callArgs, eventCollectionName;
          callArgs = testRequest.called ? testRequest.getCall(0).args : null;
          if (!callArgs) {
            should.Throw("No request was ever made to Keen.IO");  
          }
          eventCollectionName = callArgs[0];

          eventCollectionName.should.equal("testEventCollectionName");
          done();
        });
    });

    it("should allow you to tag the event for a route from the configuration", function (done) {
      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).get('/test')
        .send({
          "user": "seb"
        })
        .expect('{\n  "user": "seb"\n}', function () {
          var callArgs, event;
          callArgs = testRequest.called ? testRequest.getCall(0).args : null;
          if (!callArgs) {
            should.Throw("No request was ever made to Keen.IO");  
          }
          event = callArgs[1];

          event.tag.should.equal("testTagName");
          done();
        });
    });

    it("should send specific identity data to keen.io if the configuration mandated this", function (done) {
      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).get('/test')
        .send({
          "user": "seb"
        })
        .expect('{\n  "user": "seb"\n}', function () {
          var callArgs, event;
          callArgs = testRequest.called ? testRequest.getCall(0).args : null;
          if (!callArgs) {
            should.Throw("No request was ever made to Keen.IO");  
          }
          event = callArgs[1];

          event.identity.should.eql({
            "test": "lies all lies - see later test"
          });
          done();
        });
    });

  });

  describe("trackRoute(eventCollection, whitelistProperties, eventTag) - specific route", function () {
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
      app.post('/test', keenioMiddleware.trackRoute('eventCollectionName', {}, "Posted to test"), function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });

      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).post('/test')
        .send({
          "user": "seb"
        })
        .expect('{\n  "user": "seb"\n}', function () {

          var callArgs, eventCollection, event;
          callArgs = testRequest.called ? testRequest.getCall(0).args : null;
          if (!callArgs) {
            should.Throw("No request was ever made to Keen.IO");  
          }
          eventCollection = callArgs[0];
          event = callArgs[1];

          eventCollection.should.equal("eventCollectionName");
          event.tag.should.equal("Posted to test");
          event.should.have.property('intention');
          event.intention.should.eql({
            method: 'POST',
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
      app.post('/params/:userId/:someParam/:someOtherParam', keenioMiddleware.trackRoute(), function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });

      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).post('/params/5/7/8')
        .send({
          "user": "seb"
        })
        .expect('{\n  "user": "seb"\n}', function () {

          var callArgs, eventCollection, event;
          callArgs = testRequest.called ? testRequest.getCall(0).args : null;
          if (!callArgs) {
            should.Throw("No request was ever made to Keen.IO");  
          }
          eventCollection = callArgs[0];
          event = callArgs[1];

          eventCollection.should.equal("post-params-userId-someParam-someOtherParam");
          event.should.have.property('intention');
          event.intention.should.eql({
            method: 'POST',
            path: '/params/5/7/8',
            query: {},
            body: {
              user: "seb"
            },
            params: {
              userId: '5',
              someParam: '7',
              someOtherParam: '8'
            }
          });
          event.should.have.property("reaction");
          event.reaction.should.eql({
            user: "seb"
          });

          done();
        });
    });

    it("should send valid event data to keen.io on making a query request", function (done) {
      app.get('/test', keenioMiddleware.trackRoute(), function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });
      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).get('/test?someArgument=2&anotherArgument=4')
        .send({
          "user": "seb"
        })
        .expect('{\n  "user": "seb"\n}', function () {

          var callArgs, eventCollection, event;
          callArgs = testRequest.called ? testRequest.getCall(0).args : null;
          if (!callArgs) {
            should.Throw("No request was ever made to Keen.IO");  
          }
          eventCollection = callArgs[0];
          event = callArgs[1];

          eventCollection.should.equal("get-test");
          event.should.have.property('intention');
          event.intention.should.eql({
            method: 'GET',
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

    it("should not track a user if they could not be identified from a request", function (done) {
      app.get('/test', keenioMiddleware.trackRoute(), function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });

      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).get('/test')
        .send({
          "user": "seb"
        })
        .expect('{\n  "user": "seb"\n}', function () {
          var callArgs = testRequest.called ? testRequest.getCall(0).args : null;
          if (!callArgs) {
            should.Throw("No request was ever made to Keen.IO");  
          }
          var event = callArgs[1];

          event.identity.should.eql({});

          done();
        });
    });

    it("should send a reaction to Keen.IO if application/json is specified as the response", function (done) {
      app.get('/test', keenioMiddleware.trackRoute(), function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });

      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).get('/test')
        .send({
          "value": "json"
        })
        .expect('{\n  "value": "json"\n}', function () {
          var callArgs, event;
          callArgs = testRequest.called ? testRequest.getCall(0).args : null;
          if (!callArgs) {
            should.Throw("No request was ever made to Keen.IO");  
          }
          event = callArgs[1];

          event.intention.body.should.eql({ "value": "json" });
          done();
        });
    });

    it("should send a reaction to Keen.IO if application/x-www-form-urlencoded is specified as the response", function (done) {
      app.get('/test', keenioMiddleware.trackRoute(), function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });      

      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).get('/test')
        .type('form')
        .send('value=urlencoded')
        .expect('{\n  "value": "urlencoded"\n}', function () {
          var callArgs, event;
          callArgs = testRequest.called ? testRequest.getCall(0).args : null;
          if (!callArgs) {
            should.Throw("No request was ever made to Keen.IO");  
          }
          event = callArgs[1];

          event.intention.body.should.eql({ "value": "urlencoded" });
          done();
        });
    });

    it("should allow you to set the eventCollectionName with the first argument", function (done) {
      app.post('/test', keenioMiddleware.trackRoute('eventCollectionName'), function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });

      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).post('/test')
        .send({
          "user": "seb"
        })
        .expect('{\n  "user": "seb"\n}', function () {
          var callArgs = testRequest.called ? testRequest.getCall(0).args : null;
          if (!callArgs) {
            should.Throw("No request was ever made to Keen.IO");  
          }
          var eventCollection = callArgs[0];

          eventCollection.should.equal("eventCollectionName");

          done();
        });
    });

    it("should allow you to tag the event with the second argument", function (done) {
      app.post('/test', keenioMiddleware.trackRoute(null, {}, "Event tag"), function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });

      var testRequest = sinon.spy();
      keenioMiddleware.keenClient.addEvent = testRequest;

      request(app).post('/test')
        .send({
          "user": "seb"
        })
        .expect('{\n  "user": "seb"\n}', function () {
          var callArgs = testRequest.called ? testRequest.getCall(0).args : null;
          if (!callArgs) {
            should.Throw("No request was ever made to Keen.IO");  
          }
          var event = callArgs[1];

          event.tag.should.equal("Event tag");

          done();
        });
    });

  });

  describe("isAcceptableStatusCode()", function () {
    it('should not allow a 5xx status code', function () {
      keenioMiddleware.isAcceptableStatusCode(500).should.be.false;
    });
    
    it('should allow 401, 402, and 404 status codes', function () {
      keenioMiddleware.isAcceptableStatusCode(401).should.be.true;
      keenioMiddleware.isAcceptableStatusCode(402).should.be.true;
      keenioMiddleware.isAcceptableStatusCode(404).should.be.true;
    });

    it('should not allow most other 4xx status code', function () {
      keenioMiddleware.isAcceptableStatusCode(400).should.be.false;
      keenioMiddleware.isAcceptableStatusCode(403).should.be.false;
      keenioMiddleware.isAcceptableStatusCode(411).should.be.false;
    });
  });

});
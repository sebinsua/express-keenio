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

// @todo: Write some tests with sensible names.
// @todo: Sensible defaults for names, params, queries, key-values, etc.
// @todo: Handle json response. Handle non-json response.
// @todo: How to configure? Can I have modes and request-responses?
// @todo: JavaScript patterns for this middleware?
// @todo: Look into some way of validating arguments in JavaScript. Nice way of doing so.
// @todo: Can I detect which user is logged in (and store this in a key-value)?
// @todo: Before I release, take a look at some node.js projects I know about and see how it would be used with them.
//        Also take a look at something like this for ideas on interface: https://segment.io/libraries/node
//        Are we really dealing with events? Should event be human-readable? Were properties a intent-react generalisation?
// @todo: Remove comments by making them event emitted by noop by default.
// @todo: Update the README.md. Use the word 'track' in some places.
// @todo: Consider adding flushing/batching so that this can be used on high-scale services... But this will be handled at keenclient level, so ignore for now...

// @todo: Decorator-style version.
// @todo: Way of tagging event collection + and replacing event collection name with better name.

describe("keenioMiddleware", function () {
  
  beforeEach(function () {
    keenioMiddleware.configure({
      projectId: "<fake-project-id>",
      writeKey: "<fake-write-key>"
    });
  });

  describe("all()", function () {
    var app;

    beforeEach(function () {
      app = express();
      app.configure(function () {
        app.use(express.bodyParser());
        app.use(keenioMiddleware.all());
        app.use(app.router);
      });

      app.post('/test', function (req, res) {
        var requestBody = req.body;
        res.send(requestBody);
      });
    });

    it("should send valid event data to keen.io", function (done) {
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
        event.should.have.property('reaction');
        event.reaction.should.eql({});
      };

      request(app).post('/test')
                  .send({ "user": "seb" })
                  .expect('{\n  "user": "seb"\n}', done);
    });

  });

});
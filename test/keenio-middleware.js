var express = require('express'),
    request = require('supertest');

var keenioMiddleware = require('../');

var app = express();

app.configure(function () {
  app.use(express.bodyParser());
  app.use(app.router);
});
app.use(keenioMiddleware());


describe("keenioMiddleware", function () {
    
    beforeEach(function () {
        app.post('/test', function (req, res) {
            res.send(req.body);
        });
    });

    it("should modify the res object", function (done) {
        request(app)
           .post('/test')
           .send({ "user": "seb" })
           .expect('{"user":"seb"}', done);
    });
});
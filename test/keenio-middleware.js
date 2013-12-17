var express = require('express'),
    request = require('supertest');

var keenioMiddleware = require('../');

var app = express();

app.configure(function () {
  app.use(express.bodyParser());
  app.use(keenioMiddleware({
    projectId: "52af9a6300111c6970000002",
    writeKey: "e7ea38b39d5adccf85aca5654775aca9f8e4d53104649c218331190634f41bc45d634f23d1f2464026eb0797a36962d8c7c819d8c2d951db64169841de4054ee7bf46e1ca4a516f10dcf73a9db0244f9f32d8425d01847fba0c091a83d531d84a7e299eaba75706f01e80cf9b1a43b36"
  }));
  app.use(app.router);
});

app.post('/test', function (req, res) {
    var requestBody = req.body;
    res.send(requestBody);
});

describe("keenioMiddleware", function () {

    it("should not modify the res object", function (done) {
        request(app).post('/test')
                    .send({ "user": "seb" })
                    .expect('{\n  "user": "seb"\n}', done);
    });

});
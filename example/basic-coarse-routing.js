var express = require("express"),
	bodyParser = require("body-parser"),
	multipart = require("connect-multiparty"),
    config = require("./config.json"),
    keenioMiddleware = require('../');

var app = express();

keenioMiddleware.configure(config);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(multipart());
app.use(keenioMiddleware.handleAll());

app.get('/test', function (req, res) {
  res.json({
    special: 'hey',
    abc: 4
  });
});

app.listen(3000);

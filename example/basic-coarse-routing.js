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

var router = express.Router();

router.route('/test').get(function (req, res) {
  res.json({
    special: 'hey',
    abc: 4
  });
});

app.use(router);

app.listen(3000);

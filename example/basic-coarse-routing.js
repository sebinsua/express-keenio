var express = require("express"),
    config = require("./config.json"),
    keenioMiddleware = require('../');

var app = express();

keenioMiddleware.configure(config);
app.use(express.json());
app.use(express.urlencoded());
app.use(express.multipart());
app.use(keenioMiddleware);

app.get('/test', function (req, res) {
  res.json({
    special: 'hey',
    abc: 4
  });
});

app.listen(3000);

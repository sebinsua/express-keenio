var express = require("express"),
    clientConfig = require("./config.json").client,
    keenioMiddleware = require('../');

var app = express();

keenioMiddleware.configure({
    client: clientConfig
});

app.get('/test', keenioMiddleware.handle("testEventCollection", "Event added to collection"), function (req, res) {
   res.json({
    special: 'hey',
    abc: 4
   });
});

app.get('/array-collection-test', keenioMiddleware.handle("arrayDataCollection", "Array added to collection"), function (req, res) {
   res.json([1, 2, 3, 4, 5, 6, 7]);
});

app.listen(3000);
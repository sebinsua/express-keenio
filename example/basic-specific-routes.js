var express = require("express"),
    clientConfig = require("./config.json").client,
    keenioMiddleware = require('../');

var app = express();

keenioMiddleware.configure({
  client: clientConfig
});

app.get('/test', keenioMiddleware.trackRoute("testEventCollection", "Event added to collection"), function (req, res) {
  res.json({
    special: 'hey',
    abc: 4
  });
});

app.get('/array-collection-test', keenioMiddleware.trackRoute("arrayDataCollection", "Array added to collection"), function (req, res) {
  res.json([1, 2, 3, 4, 5, 6, 7]);
});

app.get('/array-hierarchical-properties-test', keenioMiddleware.trackRoute("arrayObjectProperties", "Array added to collection"), function (req, res) {
  res.json([
    {
      name: "Person 1",
      type: "person"
    },
    {
      name: "Person 2",
      type: "person"
    },
    {
      name: "Person 3",
      type: "person"
    },
    {
      name: "Animal 1",
      type: "cat"
    },
    {
      name: "Animal 2",
      type: "dog"
    },
  ]);
});

app.listen(3000);

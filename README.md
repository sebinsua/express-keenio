express-keenio
==============

[![Build Status](https://travis-ci.org/sebinsua/express-keenio.png)](https://travis-ci.org/sebinsua/express-keenio)

Install Keen.IO analytics support into your Node.JS app in mere seconds.

Setup
-----

It's possible to make the middleware handle all routes as shown below:

```javascript
var express = require("express"),
    keenioMiddleware = require('express-keenio');

var app = express();

keenioMiddleware.configure({ client: { projectId: '<test>', writeKey: '<test>'} });
app.configure(function () {
   app.use(express.bodyParser());
   app.use(keenioMiddleware.handleAll());
   app.use(express.router);
});

app.get('/test', function (req, res) {
   // Your code goes here.
});

```

Or it's possible to run the middleware against specific routes decorator-style:

```javascript
var express = require("express"),
    keenioMiddleware = require('express-keenio');

var app = express();

keenioMiddleware.configure({ client: { projectId: '<test>', writeKey: '<test>'} });

app.get('/test', keenioMiddleware.handle("testEventCollection", "Event added to collection"), function (req, res) {
   // Your code goes here.
});

```

Easy!

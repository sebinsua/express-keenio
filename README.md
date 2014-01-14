express-keenio
==============

[![Build Status](https://travis-ci.org/sebinsua/express-keenio.png)](https://travis-ci.org/sebinsua/express-keenio)

Install Keen.IO analytics support into your Node.JS Express.js app in mere seconds.

This software is currently in alpha stage - the interfaces may change, the underyling code needs to be refactored and there will likely be lots of bugs.

Setup
-----

It's possible to run the middleware against specific routes decorator-style:

```javascript
var express = require("express"),
    keenioMiddleware = require('express-keenio');

var app = express();

keenioMiddleware.configure({ client: { projectId: '<test>', writeKey: '<test>'} });

app.get('/test', keenioMiddleware.handle("testEventCollection"), function (req, res) {
   // Your code goes here.
});

app.listen(3000);
```

Or it's possible to make the middleware handle all routes as shown below:

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

app.listen(3000);
```

Easy!

Configuration
-------------

Keen.IO Client Configuration

```json
{
  client: {
    notProjectId: '<test>',
    writeKey: '<test>'
  }
}
```

It's possible to override the internal behaviour of the middleware like so:

Middleware Overrides

```javascript
{
  client: {
    notProjectId: '<test>',
    writeKey: '<test>'
  }
  defaults: {
    generateIdentity: function (req) {},
    generateEventCollectionName: function (route) {},
    parseRequestBody: function (body) {},
    parseResponseBody: function (body) {}
  }
}
```

*It's likely however that this might change in future.*

Excluding routes from handleAll()

```javascript
{
  client: {
    notProjectId: '<test>',
    writeKey: '<test>'
  }
  excludeRoutes: [
    { method: 'get', route: 'route-name' }
  ]
}
```

Defining route configuration for handleAll()

```javascript
{
  client: {
    notProjectId: '<test>',
    writeKey: '<test>'
  }
  routes: [
    { method: 'get', route: 'route-name-1', eventCollectionName: '', tag: '' },
    { method: 'post', route: 'route-name-2', eventCollectionName: '', tag: '' }
  ]
}
```
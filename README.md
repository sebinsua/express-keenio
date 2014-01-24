express-keenio
==============

[![Build Status](https://travis-ci.org/sebinsua/express-keenio.png)](https://travis-ci.org/sebinsua/express-keenio)

Install Keen.IO analytics support into your Node.JS [Express.js](https://github.com/visionmedia/express) app in mere seconds.

This software is currently in alpha stage - the interfaces may change, the underyling code needs to be refactored and there will likely be lots of bugs.

Premise
-------
* Events can be seen as an intention-reaction mapping.
* Events belong in a collection together when they can be described by similar properties.
* We should capture almost everything (events, environment, user identity and metadata e.g. repeat visits.)
* Installation should be fast.

Getting Started
---------------

Install it from the command line with:

```shell
$ npm install express-keenio
```

Setup
-----

It's possible to run the middleware against specific routes decorator-style:

```javascript
var express = require("express"),
    keenioMiddleware = require('express-keenio');

var app = express();

keenioMiddleware.configure({ client: { projectId: '<test>', writeKey: '<test>'} });
keenioMiddleware.on('error', console.warn);

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

keenioMiddleware.configure({ client: { projectId: '<test>', writeKey: '<test>' } });
app.configure(function () {
   app.use(express.bodyParser());
   app.use(keenioMiddleware);
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

### Keen.IO Client Configuration

```javascript
{
  client: {
    projectId: '<test>',
    writeKey: '<test>'
  }
}
```

### Middleware Overrides

It's possible to override the internal behaviour of the middleware like so:

```javascript
{
  client: {
    projectId: '<test>',
    writeKey: '<test>'
  }
  handlers: {
    generateIdentity: function (req) {},
    generateEventCollectionName: function (route) {},
    parseRequestBody: function (body) {},
    parseResponseBody: function (body) {}
  }
}
```

### Excluding routes from default middleware operation

```javascript
{
  client: {
    projectId: '<test>',
    writeKey: '<test>'
  }
  excludeRoutes: [
    { method: 'get', route: 'route-name' }
  ]
}
```

### Defining route configuration for middleware operation

```javascript
{
  client: {
    projectId: '<test>',
    writeKey: '<test>'
  }
  routes: [
    { method: 'get', route: 'route-name-1', eventCollectionName: '', tag: '' },
    { method: 'post', route: 'route-name-2', eventCollectionName: '', tag: '' }
  ]
}
```

*You must pick either 'routes' or 'excludeRoutes' but not both.*

Note
----
* There should be no more than 1,000 properties per EventCollection so dynamic naming of properties may be harmful. Responses with these should be switched off if possible.

Tests
-----
```shell
$ npm install --dev
$ npm test
```

Contributors
------------
* [Seb Insua](http://github.com/sebinsua)

License
-------

[BSD 2-Clause License](https://github.com/sebinsua/express-keenio/blob/master/LICENSE)

Copyright (c) 2014, Seb Insua
All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice, this
  list of conditions and the following disclaimer in the documentation and/or
  other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

express-keenio
==============

[![Build Status](https://travis-ci.org/sebinsua/express-keenio.png)](https://travis-ci.org/sebinsua/express-keenio)

Install Keen.IO analytics support into your Node.JS [Express.js](https://github.com/visionmedia/express) app in mere seconds.

Getting Started
---------------

Install it from the command line with:

```shell
$ npm install express-keenio
```

Setup
-----

It's possible to use the middleware against specific routes decorator-style:

```javascript
var express = require("express"),
    keenio = require('express-keenio');

var app = express();

keenio.configure({ client: { projectId: '<test>', writeKey: '<test>'} });
keenio.on('error', console.warn); // There are 'error', 'info', 'track', and 'flush' events which are emitted.

app.get('/test', keenio.trackRoute("testEventCollection"), function (req, res) {
   // Your code goes here.
});

app.listen(3000);
```

Or it's possible to make the middleware handle all routes as shown below:

```javascript
var express = require("express"),
    keenio = require('express-keenio');

var app = express();

keenio.configure({ client: { projectId: '<test>', writeKey: '<test>' } });
app.configure(function () {
   app.use(express.bodyParser());
   app.use(keenio);
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

See [KeenClient-Node#initialization](https://github.com/keenlabs/KeenClient-node#initialization).

```javascript
{
  client: {
    projectId: '<test>',
    writeKey: '<test>'
  }
}
```

### Route Configuration

If you are not using the decorator-style version of the middleware, and would like either more control over which event collections exist or the ability to disable specific event collections you may configure the middleware.

*You must pick either 'routes' or 'excludeRoutes' but not both.*

#### Excluding routes from default middleware operation

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

#### Defining route configuration for middleware operation

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

### Middleware Overrides

While not recommended it's possible to override some of the internal behaviours of the middleware like so:

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

Tests
-----
```shell
$ npm install --dev
$ npm test
```

Premise
-------
* Events can be seen as an intention-reaction mapping.
* Events belong in a collection together when they can be described by similar properties.
* We should capture almost everything (events, environment, user identity and metadata e.g. repeat visits.)
* Installation should be fast.

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

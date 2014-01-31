[express-keenio](http://sebinsua.github.io/express-keenio/)
==============

[![Build Status](https://travis-ci.org/sebinsua/express-keenio.png)](https://travis-ci.org/sebinsua/express-keenio)

Install [Keen.IO](http://keen.io) analytics support into your Node.JS [Express.js](https://github.com/visionmedia/express) app in mere seconds and instantly begin capturing data.

Once installed it creates Keen.IO events from HTTP requests based on data intercepted from the calls `res.json()`, `res.jsonp()`, `res.send()`, `res.render()`, `res.redirect()`, `res.sendfile()` and `res.download()`.

For example, an event might look like this:

```json
{
  "identity": {
    "user": {
      "name": "Joe Bloggs",
      "email": "joe@example.com",
      "age": 17
    },
    "session": {
      "id": "some-identifier"
    },
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1700.77 Safari/537.36"
  },
  "intention": {
    "method": "POST",
    "path": "/pay-user/5",
    "params": {
      "userId": 5
    },
    "body": {
      "price": 5.00
    },
    "query": {},
    "referer": "http://keen.io/" 
  },
  "reaction": {
    "success": true,
    "userAddress": "..."
  },
  "httpStatus": 200,
  "environment": {
    "library": "express-keenio"
  }
}
```

Getting Started
---------------

Install it from the command line with:

```shell
$ npm install express-keenio
```

Usage
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

### Event Property Limitation

Keen.IO has a set limit of 1000 on the number of event properties belonging to an Event Collection and after this it will drop all events and error.

The middleware provides defaults which should ensure this doesn't happen, but I **STRONGLY** recommend switching to explicit whitelists as soon as you become reliant on the system and understand what's important for your analytics needs.

### Whitelist Properties

There are some default property whitelists in the form of `whitelistProperties.query`, `whitelistProperties.body`, `whitelistProperties.reaction`. Whitelists can also exist against each route definition or be passed into the second argument of the `keenio.trackRoute()` function.

Example 1:

```javascript
{
  client: {
    projectId: '<test>',
    writeKey: '<test>'
  },
  whitelistProperties: {
    query: ['id', 'userId', 'name', 'type'],
    body: [],
    reaction: ['description']
  }
}
```

*NOTE 1: An empty array means nothing is whitelisted while a missing whitelist key means no whitelist is applied.*

*NOTE 2: `whitelistProperties.query` takes just a property name, while `whitelistProperties.body` and `whitelistProperties.reaction` can take deep property identifiers (e.g. 'deep.array[].name' or 'deep.property.value'.)*

Example 2:

```javascript

app.get('/test', keenio.trackRoute("testEventCollection", { query: ['id', 'userId', 'name', 'type'], body: [] }), function (req, res) {
   // Your code goes here.
});

```

*NOTE: `whitelistProperties.body` and `whitelistProperties.reaction` support whitelisting `deep.properties.like.this`.*

By default this middleware provides a (hopefully) sane fallback in the form of eventually rigid schemas. First of all, by default we accept up to 50 properties in the `intention.query`, 100 properties in a `intention.body`, and 100 properties in a `reaction`. Additionally after a route receives 500 requests or exists for a week it stops accepting new event properties. Properties will be kept in the order of popularity.

### Blacklist Properties

By default we delete any 'password' properties. If you wish you can pass in a list of other properties you wish to explicitly blacklist as shown below:

```javascript
{
  client: {
    projectId: '<test>',
    writeKey: '<test>'
  },
  blacklistProperties: ['passwordHash', 'apiKey', 'authToken', 'userKey']
}
```

*NOTE: `blacklistProperties` takes a property name that can be found anywhere inside an object. This means that 'passwordHash' would delete properties like intention.query.passwordHash and reaction.passwordHash. It does not allow you to specify exact properties at a particular depth like `whitelistProperties.body` and `whitelistProperties.reaction` allow.*

### Route Configuration

If you are not using the decorator-style version of the middleware, and would like either more control over which event collections exist or the ability to disable specific event collections you may configure the middleware.

*You must pick either 'routes' or 'excludeRoutes' but not both.*

#### Excluding routes from default middleware operation

```javascript
{
  client: {
    projectId: '<test>',
    writeKey: '<test>'
  },
  excludeRoutes: [
    { method: 'GET', route: 'route-name' }
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
    { method: 'GET', route: 'route-name-1', eventCollectionName: '', whitelistProperties: {} },
    { method: 'POST', route: 'route-name-2', eventCollectionName: '' }
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
  },
  handlers: {
    generateIdentity: function (req) {},
    generateEventCollectionName: function (route) {},
    parseRequestBody: function (body) {},
    parseResponseBody: function (body) {}
  }
}
```

Premise
-------
* Events can be seen as an intention-reaction mapping.
* Events belong in a collection together when they can be described by similar properties.
* We should capture almost everything (events, environment, user identity and metadata e.g. repeat visits.)
* Installation should be fast.

Support
-------

Feel free to submit issues and pull requests.

### Tests

```shell
$ npm install --dev
$ npm test
```

### Contributors

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

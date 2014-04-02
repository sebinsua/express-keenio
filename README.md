[express-keenio](http://sebinsua.github.io/express-keenio/)
==============

[![Build Status](https://travis-ci.org/sebinsua/express-keenio.png)](https://travis-ci.org/sebinsua/express-keenio)

Install [Keen IO analytics](http://keen.io/) support into your Node.JS [Express.js](https://github.com/visionmedia/express) app in mere seconds and instantly begin capturing data.

Once installed it creates Keen.IO events from HTTP requests based on data intercepted from the calls `res.json()`, `res.jsonp()`, `res.send()`, `res.render()`, `res.redirect()`, `res.sendfile()` and `res.download()`.

Read about [why the middleware was made and the use cases it solves here](https://keen.io/blog/78561215787/how-to-install-keen-io-analytics-into-your-node-js-app).

Getting Started
---------------

**[Sign up to Keen IO for free here](https://keen.io/signup)**. And then install the package from the command line with:

```shell
$ npm install express-keenio
```


Usage
-----

It's possible to use the middleware with specific routes decorator-style, like so:

```javascript
var express = require("express"),
    keenio = require('express-keenio');

var app = express();

keenio.configure({ client: { projectId: '<test>', writeKey: '<test>'} });
keenio.on('error', console.warn); // There are 'error', 'info', 'track', and 'flush' events which are emitted.

app.get('/test', keenio.trackRoute('testCollection'), function (req, res) {
  // You code goes here.
});

app.post('/payment', keenio.trackRoute("payments",
                                      { query: ['userId', 'itemId', 'type', 'quantity', 'price'],
                                        reaction: ['receipt.status', 'receipt.tax'] }), function (req, res) {
  // Your code goes here.
});

app.listen(3000);
```

It's also possible to make the middleware handle all routes by `use`ing it against the `app`:

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

What will an event look like?
-----------------------------

The middleware will create something that looks sort of like this:

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

Keen.IO has a set limit of 1000 on the number of event properties belonging to an Event Collection and after this it will begin to drop events.

Once you are reliant on analytics I **STRONGLY** recommend switching to explicit whitelists.

However by default this middleware provides a fallback in the form of [eventually rigid schemas](https://github.com/sebinsua/eventual-schema). Firstly, by default we accept up to 30 properties in the `intention.query`, 80 properties in a `intention.body`, and 120 properties in a `reaction`. Secondly, after a route receives 500 requests or exists for a week it stops accepting new event properties. Once these properties are discovered we cache them in a file given by `options.defaults.eventualSchemas.cachePath` (normally, './route-schemas.cache') however this feature can be switched off by giving `options.defaults.eventualSchemas.cache` the value `false` or specifying a complete explicit whitelist against a route.

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

*NOTE 1: An empty array means nothing is whitelisted while a missing whitelist key means no whitelist should be applied to the data.*

*NOTE 2: `whitelistProperties.query`, `whitelistProperties.body` and `whitelistProperties.reaction` can take deep property identifiers (e.g. 'deep.array[].name' or 'deep.property.value'.)*

Example 2:

```javascript

app.get('/test', keenio.trackRoute("testEventCollection", { query: ['id', 'userId', 'name', 'type'], body: [] }), function (req, res) {
   // Your code goes here.
});
```

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

*NOTE: `blacklistProperties` takes a property name that can be found anywhere inside an object. This means that 'passwordHash' would delete properties like `intention.query.passwordHash` and `reaction.passwordHash`. It does not allow you to specify exact properties at a particular depth like `whitelistProperties.query`, `whitelistProperties.body` and `whitelistProperties.reaction` each allow.*

### Route Configuration

If you are not using the decorator-style version of the middleware, and would like either (a) more control over which event collections exist or (b) the ability to disable specific event collections you may configure the routes upfront.

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

### Defaults

It's also possible to override some of the default values used by validators, route schemas, etc.

```javascript
{
  client: {
    projectId: '<test>',
    writeKey: '<test>'
  },
  defaults: {
    addons: {
      ipToGeo: false,
      userAgentParser: false
    },
    MAX_PROPERTY_HIERARCHY_DEPTH: 10,
    MAX_STRING_LENGTH: 1000,
    MAX_PROPERTY_QUANTITY: 300,
    eventualSchemas: {
      cache: true,
      cachePath: './route-schemas.cache',
      query: {
        MAX_PROPERTIES: 30,
        NUMBER_OF_INSTANCES: 500,
        NUMBER_OF_DAYS: 7
      },
      body: {
        MAX_PROPERTIES: 80,
        NUMBER_OF_INSTANCES: 500,
        NUMBER_OF_DAYS: 7
      },
      reaction: {
        MAX_PROPERTIES: 120,
        NUMBER_OF_INSTANCES: 500,
        NUMBER_OF_DAYS: 7
      }
    }
  }
}
```

### Data Enrichment Addons

Keen IO supports two data enrichment addons: IP-to-GEO conversion and UserAgent parsing. If you would like to activate these addons for your project, just ask! The team is available in [HipChat](http://users.keen.io/), [IRC](http://webchat.freenode.net/?channels=keen-io), or at [contact@keen.io](mailto:contact@keen.io).


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

Support
-------

Feel free to submit issues and pull requests.

### Tests

```shell
$ npm install --dev
$ npm test
```

### Contributors

* [Seb Insua](http://github.com/sebinsua) - [@sebinsua](http://twitter.com/sebinsua)

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


[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/sebinsua/express-keenio/trend.png)](https://bitdeli.com/free "Bitdeli Badge")


"use strict";

// Grab dependencies required by the middleware.
var util         = require('util'),
    keen         = require('keen.io'),
    // See [connect-friendwares](http://github.com/sebinsua/connect-friendwares).
    friendwares  = require('connect-friendwares'),
    EventEmitter = require('events').EventEmitter;


// See [lib/core/helpers](http://sebinsua.github.io/express-keenio/helpers.html).
var helpers       = require('./core/helpers'),
    // See [lib/core/options-parser](http://sebinsua.github.io/express-keenio/options-parser.html).
    optionsParser = require('./core/options-parser');


    // See [lib/routes](http://sebinsua.github.io/express-keenio/routes.html).
var RoutesModule          = require('./routes'),
    // See [lib/parse/proxy-response](http://sebinsua.github.io/express-keenio/proxy-response.html).
    ProxyResponseModule   = require('./parse/proxy-response'),
    // See [lib/parse/request](http://sebinsua.github.io/express-keenio/request.html).
    RequestModule         = require('./parse/request'),
    // See [lib/parse/identify](http://sebinsua.github.io/express-keenio/identify.html).
    IdentifyModule        = require('./parse/identify'),
     // See [lib/event-collection](http://sebinsua.github.io/express-keenio/event-collection.html).
    EventCollectionModule = require('./event-collection'),
    // See [lib/keen-event](http://sebinsua.github.io/express-keenio/keen-event.html).
    KeenEventModule       = require('./keen-event');


// Construct the middleware uninitialised with some default events.
function KeenioMiddleware () {
  this.options = {};
  this.handlers = {};
  this.initialized = false;

  // This initialises an internal `_ee` EventEmitter with the events: error, info, track and flush.
  this._ee = helpers.setDefaultEvents(new EventEmitter(), ['error', 'info', 'track', 'flush']);
}

// Bind the EventEmitter methods to the middleware.
helpers.forEach(EventEmitter.prototype, function (fn, key) {
  KeenioMiddleware.prototype[key] = function () {
    this._ee[key].apply(this, arguments);
  };
});

// Before the middleware can be used it must have its configuration passed into it.
KeenioMiddleware.prototype.configure = function (options) {
  this.options = optionsParser.parse(options);
  
  this._configureHandlers(this.options);

  this.keenClient = keen.configure(options.client);
  this.initialized = true;
  this.emit('initialized');
};

// A method may be called to check whether the middleware has had configure() called before
// it is used. It will throw an exception if the middleware has not yet been initialised.
KeenioMiddleware.prototype.checkInitialized = function () {
  if (!this.initialized) {
    throw new Error('express-keenio middleware must be configured before use. Please call ' +
                    'keenio-middleware#configure(options).');
  }
  return true;
};

// This method allows us to check that the middleware is in use by Express and not
// just Connect. It does this by checking for the existence of a middleware called
// 'expressInit'. 
// 
// The purpose of this is that the middleware requires some behaviours given by Express,
// particularly relating to route definitions.
KeenioMiddleware.prototype.isMiddlewareUsedByExpress = function (app) {
  return friendwares(app).has('expressInit');
};

// This is exposed in order that an instance of the middleware can be passed directly into 
// app.use() - which either executes a function, or looks for the function at an object's
// `handle` property.
KeenioMiddleware.prototype.handle = function keenioHandler(req, res, next) {
  var middleware = this.handleAll();
  middleware(req, res, next);
};

KeenioMiddleware.prototype.handleAll = KeenioMiddleware.prototype.track = function () {
  this.checkInitialized();

  return this._generateHandler({});
};

// `trackRoute()` allows the middlewares to be attached to specific [Express.js](http://expressjs.com)
// routes and to explicitly define their event collection name. 
KeenioMiddleware.prototype.trackRoute = function (eventCollectionName, whitelistProperties, eventTag) {
  this.checkInitialized();

  return this._generateHandler({
    eventCollectionName: eventCollectionName,
    whitelistProperties: whitelistProperties,
    tag: eventTag
  });
};

// This is an internal method which generates the middleware handler when given a routeConfig.
// The routeConfig must be empty if we are using the middleware against the whole app.
KeenioMiddleware.prototype._generateHandler = function (routeConfig) {
  var self = this;

  return function keenioHandler(req, res, next) {
    // We ensure that the middleware is being used by an express app.
    if (!req.app || !self.isMiddlewareUsedByExpress(req.app)) {
      self.emit('error', 'Currently this middleware is only supported by Express.js.');
      return next();
    }

    // We swap the methods on a response object with proxied versions, and respond
    // with a parsedResponseData object that is still in scope of the res object's proxied
    // response methods (closures.)
    // This may not be the most elegant solution but it works.
    var parsedResponseData = self.proxyResponseHandler.proxyResponseObject(res);

    // We setup a function that will be called when a response is finished, and pass 
    // in the request object, routeConfig, and parsedResponseData object.
    // The parsedResponseData object at this point contains no data, but since it is
    // still in the scope of the proxied response object it will contain response data
    // by the time the response has had its `finish` event emitted.
    res.on("finish", self._finishResponse(req, parsedResponseData, routeConfig));

    return next();
  };
};

KeenioMiddleware.prototype._finishResponse = function (req, _parsedResponseData, routeConfig) {
  var self = this;
  return function onResponseFinish() {
    // It's only at the response 'finish' event that we can be sure that req.route is set.
    // This is due to express populating it in the app.router middleware.
    if (!req.route) {
      return false; // If a non-route middleware has been run this would be the case. E.g. favicon.ico
    }

    // If a route is excluded in the configuration we end the middleware having made no requests
    // to [Keen.IO](http://keen.io).
    if (self.options.hasOwnProperty('excludeRoutes')) {
      if (self.routesHandler.isExcludedRoute(req.route)) {
        return false;
      }
    }

    // If a route has data stored in the 'routes' key of the configuration, we fetch this data.
    if (self.options.hasOwnProperty('routes')) {
      var eventCollectionMetadata = self.routesHandler.getRouteConfig(req.route);
       // If a route has no config but the configuration does have a routes key then consider it excluded.
      if (!eventCollectionMetadata) { return false; }

      routeConfig = helpers.extend({}, eventCollectionMetadata, routeConfig);
    }

    var identity = self.identifyHandler.identify(req),
        parsedRequestData = self.requestHandler.parseRequestObject(req),
        parsedResponseData = _parsedResponseData;
    
    var eventCollection, keenEvent;
    // We test to see if an event collection name is defined by any configuration and that it is valid.
    // If it is not valid then we attempt to generate it from the route.
    if (routeConfig.eventCollectionName) {
      if (self.eventCollectionHandler._isValidEventCollectionName(routeConfig.eventCollectionName)) {
        eventCollection = routeConfig.eventCollectionName;
      } else {
        self.emit('error', 'ERROR: ' + routeConfig.eventCollectionName + ' is not a valid event collection name so another has been automatically generated.');
        eventCollection = self.eventCollectionHandler.generateName(req.route);
      }
    } else {
      eventCollection = self.eventCollectionHandler.generateName(req.route);
    }

    keenEvent = self.keenEventHandler.generateEvent(identity, parsedRequestData, parsedResponseData, routeConfig);

    self._trackEvent(eventCollection, keenEvent);
  };
};

// Given an event collection name and a Keen.IO event we send out a track event
// and make a request to Keen.IO.
KeenioMiddleware.prototype._trackEvent = function (eventCollection, keenEvent) {
  var keenioMiddlewareScope = this;
  this.emit("track", { eventCollection: eventCollection, keenEvent: keenEvent });
  this.keenClient.addEvent(eventCollection, keenEvent, function (err, res) {
    if (err) {
      return keenioMiddlewareScope.emit("error", err);
    }

    if (res.created) {
      keenioMiddlewareScope.emit("info", "Keen.IO event created.");
    } else {
      keenioMiddlewareScope.emit("info", "Keen.IO event not created.");
    }
  });
};

KeenioMiddleware.prototype._configureHandlers = function (options) {
  this.routesHandler = new RoutesModule(options, this._ee);
  this.proxyResponseHandler = new ProxyResponseModule(options, this._ee);
  this.requestHandler = new RequestModule(options, this._ee);
  this.identifyHandler = new IdentifyModule(options, this._ee);
  this.eventCollectionHandler = new EventCollectionModule(options, this._ee);
  this.keenEventHandler = new KeenEventModule(options, this._ee);
};

exports = module.exports = new KeenioMiddleware();
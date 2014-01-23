"use strict";

var util = require('util'),
    keen = require('keen.io'),
    friendwares = require('connect-friendwares'),
    EventEmitter = require('events').EventEmitter;

var helpers = require('./helpers'),
    optionsParser = require('./options-parser');

var RoutesModule = require('./routes'),
    EventCollectionModule = require('./event-collection');

var proxyResponseModule = require('./proxy-response'),
    proxyResponseObject = proxyResponseModule.proxyResponseObject;

function KeenioMiddleware () {
  EventEmitter.call(this);

  this.options = {};
  this.handlers = {};
  this.initialized = false;

  this.on("error", console.warn);
  this.on("info", helpers.noop);
  this.on("track", helpers.noop);
  this.on("flush", helpers.noop);
}
util.inherits(KeenioMiddleware, EventEmitter);

KeenioMiddleware.prototype.configure = function (options) {
  this.options = optionsParser.parse(options);
  
  this._configureHandlers(this.options);

  this.keenClient = keen.configure(options.client);
  this.initialized = true;
  this.emit('initialized');
};

KeenioMiddleware.prototype._configureHandlers = function (options) {
  this.routesHandler = new RoutesModule(options);
  this.eventCollectionHandler = new EventCollectionModule(options);

    // generateIdentity: function (req) {},
    // generateEventCollectionName: function (route) {},
    // parseRequestBody: function (body) {},
    // parseResponseBody: function (body) {}
    /*
    n. Each domain has a model which stores some of the data passed to it in this.options.handlers.

    n. Setting up 'handlers' should be done in configure() - creation of objects which handle each of these things and own methods.

    n. categorise methods properly:
           event collection names (validate + generate)
             -> routes
                -> request/params (intention)
                    -> tracking
                    -> identify (evironment + users)
                    -> response (reaction)
    */
};

KeenioMiddleware.prototype.checkInitialized = function () {
  if (!this.initialized) {
    throw new Error('express-keenio middleware must be configured before use. Please call ' +
                    'keenioMiddleware.configure(options).');
  }
  return true;
};

KeenioMiddleware.prototype.isMiddlewareUsedByExpress = function (app) {
  return friendwares(app).has('expressInit');
};

KeenioMiddleware.prototype.handle = KeenioMiddleware.prototype.handleAll = function () {
  this.checkInitialized();

  return this._generateHandler({});
};

KeenioMiddleware.prototype.trackRoute = function (eventCollectionName, eventTag) {
  this.checkInitialized();

  return this._generateHandler({
    eventCollectionName: eventCollectionName,
    tag: eventTag
  });
};

KeenioMiddleware.prototype._generateHandler = function (routeConfig) {
  var handleMiddlewareScope = this;

  return function keenioHandler(req, res, next) {
    if (!handleMiddlewareScope.isMiddlewareUsedByExpress(req.app)) {
      handleMiddlewareScope.emit('error', 'Currently this middleware is only supported by Express.js.');
      return next();
    }

    var parsedResponseData = {};
    proxyResponseObject.call(parsedResponseData, res, handleMiddlewareScope);

    res.on("finish", handleMiddlewareScope._finishResponse(req, parsedResponseData, routeConfig));

    return next();
  };
};

KeenioMiddleware.prototype._finishResponse = function (req, parsedResponseData, routeConfig) {
  var self = this;
  return function onResponseFinish() {
    // It's only at the response 'finish' event that we can be sure that req.route is set.
    // This is due to express populating it in the app.router middleware.
    if (!req.route) {
      return false; // If a non-route middleware has been run this would be the case. E.g. favicon.ico
    }

    if (self.options.excludeRoutes) {
      if (self.routesHandler.isExcludedRoute(req.route)) {
        return false;
      }
    }

    if (self.options.routes) {
      var eventCollectionMetadata = self.routesHandler.getRouteConfig(req.route);
      if (!eventCollectionMetadata) { // If this route had no config, then ignore.
        return false;
      }
      routeConfig = helpers.extend({}, eventCollectionMetadata, routeConfig);
    }
    
    var eventCollection = routeConfig.eventCollectionName ? routeConfig.eventCollectionName
                                                          : self.eventCollectionHandler.generateName(req.route),
        keenEvent = self.generateKeenEvent(req, parsedResponseData, routeConfig);

    self.track(eventCollection, keenEvent);
  };
};

KeenioMiddleware.prototype.track = function (eventCollection, keenEvent) {
  // @TODO: Might be a good idea to test this manually.
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

// Keen Events

KeenioMiddleware.prototype.generateKeenEvent = function (req, parsedResponseData, routeConfig) {
  var _getParams = function (weirdParamObject) {
    var params = {};
    if (weirdParamObject) {
      for (var paramName in weirdParamObject) {
        params[paramName] = weirdParamObject[paramName];
      }
    }
    return params;
  };

  var keenEvent = this._sanitizeData({
    intention: {
      path: req.path,
      body: this.parseRequestBody(req),
      query: req.query,
      params: _getParams(req.route.params)
    },
    identity: this.identify(req),
    reaction: parsedResponseData.reaction,
    status: parsedResponseData.status,
    tag: routeConfig.tag || null,
    environment: {
      library: 'express-keenio'
    }
  });

  return keenEvent;
};

KeenioMiddleware.prototype._sanitizeData = function (data) {
  var keenioMiddlewareScope = this;

  var BAD_PROPERTIES = ['password'].concat(this.options && this.options.badProperties || []),
      SMITE = "[redacted]";
  if (!helpers.isEnumerable(data)) {
    return data;
  } else {
    helpers.forEach(data, function (value, key) {
      if (BAD_PROPERTIES.indexOf(key) !== -1) {
        value = SMITE;
      }
      if (keenioMiddlewareScope._isValidProperty(key)) {
        data[key] = keenioMiddlewareScope._sanitizeData(value);
      } else {
        delete data[key];
      }
    });
  }
  return data;
};

KeenioMiddleware.prototype._isValidProperty = function (potentialProperty) {
  if (!potentialProperty) {
    return false;
  }
  if (potentialProperty.length > 256) {
    return false;
  }
  if (potentialProperty.charAt(0) === '$') {
    return false;
  }
  if (potentialProperty.indexOf('.') !== -1) {
    return false;
  }

  return true;
};

// === 

// Identification

KeenioMiddleware.prototype.identify = function (req) {
  if (this.options && this.options.handlers && this.options.handlers.generateIdentity) {
    return this.options.handlers.generateIdentity(req);
  } else {
    return this._fallbackIdentify(req);
  }
};

KeenioMiddleware.prototype._fallbackIdentify = function (req) {
  if (req.user) {
    return req.user;
  } else if (req.session) {
    return req.session;
  }
  return {};
};

// === 

// Requests

KeenioMiddleware.prototype.parseRequestBody = function (req) {
  if (!req.is('application/json')) {
    return {};
  }
  if (helpers.isArray(req.body)) { // @todo: https://github.com/sebinsua/express-keenio/issues/7
    return {};
  }

  if (this.options && this.options.handlers && this.options.handlers.parseRequestBody) {
    return this.options.handlers.parseRequestBody(req.body);
  } else {
    return this._fallbackParseRequestBody(req.body);
  }
};

KeenioMiddleware.prototype._fallbackParseRequestBody = function (body) {
  return body;
};

// ===

// Responses

KeenioMiddleware.prototype.parseResponseBody = function (data) {
  if (helpers.isArray(data)) { // @todo: https://github.com/sebinsua/express-keenio/issues/7
    return {};
  }

  if (this.options && this.options.handlers && this.options.handlers.parseResponseBody) {
    return this.options.handlers.parseResponseBody(data);
  } else {
    return this._fallbackParseResponseBody(data);
  }
};

KeenioMiddleware.prototype._fallbackParseResponseBody = function (body) {
  return body;
};

// === 

exports = module.exports = new KeenioMiddleware();
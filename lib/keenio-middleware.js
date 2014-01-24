"use strict";

var util         = require('util'),
    keen         = require('keen.io'),
    friendwares  = require('connect-friendwares'),
    EventEmitter = require('events').EventEmitter;

var helpers       = require('./core/helpers'),
    optionsParser = require('./core/options-parser');

var RoutesModule          = require('./routes'),
    ProxyResponseModule   = require('./parse/proxy-response'),
    EventCollectionModule = require('./event-collection'),
    KeenEventModule       = require('./keen-event');

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

KeenioMiddleware.prototype.handle = function (req, res, next) {
  var middleware = this.handleAll();
  middleware(req, res, next);
};

KeenioMiddleware.prototype.handleAll = function () {
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
  var self = this;

  return function keenioHandler(req, res, next) {
    if (!self.isMiddlewareUsedByExpress(req.app)) {
      self.emit('error', 'Currently this middleware is only supported by Express.js.');
      return next();
    }

    var parsedResponseData = {};
    self.proxyResponseHandler.proxyResponseObject.call(parsedResponseData, res);

    res.on("finish", self._finishResponse(req, parsedResponseData, routeConfig));

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

    if (self.options.hasOwnProperty('excludeRoutes')) {
      if (self.routesHandler.isExcludedRoute(req.route)) {
        return false;
      }
    }

    if (self.options.hasOwnProperty('routes')) {
      var eventCollectionMetadata = self.routesHandler.getRouteConfig(req.route);
      if (!eventCollectionMetadata) { // If this route had no config, then ignore.
        return false;
      }
      routeConfig = helpers.extend({}, eventCollectionMetadata, routeConfig);
    }
    
    var eventCollection = routeConfig.eventCollectionName ? routeConfig.eventCollectionName
                                                          : self.eventCollectionHandler.generateName(req.route),
        keenEvent = self.keenEventHandler.generateEvent(req, parsedResponseData, routeConfig);

    self._track(eventCollection, keenEvent);
  };
};

KeenioMiddleware.prototype._track = function (eventCollection, keenEvent) {
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
  this.routesHandler = new RoutesModule(options);
  this.proxyResponseHandler = new ProxyResponseModule(options);
  this.eventCollectionHandler = new EventCollectionModule(options);
  this.keenEventHandler = new KeenEventModule(options);
};

exports = module.exports = new KeenioMiddleware();
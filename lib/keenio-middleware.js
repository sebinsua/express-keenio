"use strict";

var util = require('util'),
    keen = require('keen.io'),
    EventEmitter = require('events').EventEmitter;

var friendwares = require('connect-friendwares');

var helpers = require('./helpers'),
    optionsParser = require('./options-parser'),
    routeHandler = require('./routes');

var defaultOptions = require('./default-options');

function KeenioMiddleware () {
  EventEmitter.call(this);

  this._defaultOptions = defaultOptions || {};
  this.options = {};
  this.initialized = false;

  this.on("error", console.warn);
  this.on("info", helpers.noop);
  this.on("track", helpers.noop);
  this.on("flush", helpers.noop);
}
util.inherits(KeenioMiddleware, EventEmitter);

KeenioMiddleware.prototype.configure = function (options) {
  this.options = helpers.extend({}, this._defaultOptions, optionsParser.parse(options));
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

KeenioMiddleware.prototype.handle = function (eventCollectionName, eventTag) {
  this.checkInitialized();

  return this._generateHandler({
    eventCollectionName: eventCollectionName,
    tag: eventTag
  });
};

KeenioMiddleware.prototype.handleAll = function () {
  this.checkInitialized();

  return this._generateHandler({});
};

KeenioMiddleware.prototype._generateHandler = function (props) {
  var handleMiddlewareScope = this,
      middlewareOptions = this.options;

  return function keenioHandler(req, res, next) {
    if (!handleMiddlewareScope.isMiddlewareUsedByExpress(req.app)) {
      handleMiddlewareScope.emit('error', 'Currently this middleware is only supported by Express.js.');
      return next();
    }

    var eventCollection, keenEvent, _status, _reaction;

    var responseSend = res.send;
    res.send = function ( /* arguments */ ) {
      var responseData = handleMiddlewareScope._getResponseData(arguments);

      _reaction = handleMiddlewareScope.parseResponseBody(responseData.reaction);
      _status = responseData.status;

      responseSend.apply(res, arguments);
    };

    res.on("finish", function () {
      // @todo: CHECK WHETHER THIS CAN BE TESTED BEFORE PROXYING OF RESPONSE OBJECT
      var route = req.route; // req will now have the express route bound to it.
      if (!route) { // If a normal middleware had been run, without a route this would be the case. E.g. favicon.ico
        return false;
      }

      if (handleMiddlewareScope._isExcludedRoute(route)) {
        return false;
      }

      var eventCollectionMetadata = handleMiddlewareScope._getRouteConfig(route);
      if (eventCollectionMetadata === false) {
        return false;
      }
      props = helpers.extend(eventCollectionMetadata, props);

      eventCollection = props.eventCollectionName ? props.eventCollectionName : handleMiddlewareScope.generateEventCollectionName(route);

      var _getParams = function (weirdParamObject) {
        var params = {};
        if (weirdParamObject) {
          for (var paramName in weirdParamObject) {
            params[paramName] = weirdParamObject[paramName];
          }
        }
        return params;
      };
      keenEvent = handleMiddlewareScope._sanitizeData({
        intention: {
          path: req.path,
          body: handleMiddlewareScope.parseRequestBody(req),
          query: req.query,
          params: _getParams(route.params)
        },
        identity: handleMiddlewareScope.identify(req),
        reaction: _reaction,
        status: _status,
        tag: props.tag
      });

      handleMiddlewareScope.track(eventCollection, keenEvent);
    });

    return next();
  };
};

KeenioMiddleware.prototype.generateEventCollectionName = function (route) {
  if (this.options && this.options.defaults && this.options.defaults.generateEventCollectionName) {
    return this.options.defaults.generateEventCollectionName(route);
  } else {
    return this._fallbackEventCollectionName(route);
  }
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

KeenioMiddleware.prototype.identify = function (req) {
  if (this.options && this.options.defaults && this.options.defaults.generateIdentity) {
    return this.options.defaults.generateIdentity(req);
  } else {
    return this._fallbackIdentify(req);
  }
};

KeenioMiddleware.prototype.parseRequestBody = function (req) {
  if (!req.is('application/json')) {
    return {};
  }
  if (helpers.isArray(req.body)) { // @todo: https://github.com/sebinsua/express-keenio/issues/7
    return {};
  }

  if (this.options && this.options.defaults && this.options.defaults.parseRequestBody) {
    return this.options.defaults.parseRequestBody(req.body);
  } else {
    return this._fallbackParseRequestBody(req.body);
  }
};

KeenioMiddleware.prototype.parseResponseBody = function (data) {
  if (helpers.isArray(data)) { // @todo: https://github.com/sebinsua/express-keenio/issues/7
    return {};
  }

  if (this.options && this.options.defaults && this.options.defaults.parseResponseBody) {
    return this.options.defaults.parseResponseBody(data);
  } else {
    return this._fallbackParseResponseBody(data);
  }
};

KeenioMiddleware.prototype.isMiddlewareUsedByExpress = function (app) {
  return friendwares(app).has('expressInit');
};

KeenioMiddleware.prototype._fallbackEventCollectionName = function (route) {
  var eventCollection;
  eventCollection = route.path.replace(/\//g, "-");
  eventCollection = eventCollection.charAt(0) === '-' ? eventCollection.slice(1) : eventCollection;
  // We have keys - and know which are optional - and which we received data for. We could do more...
  eventCollection = eventCollection.replace(/:/g, '');
  if (eventCollection.length === 0) { // If we were accessing the empty path then...
    eventCollection = 'root';
  }
  // Make sure we separate on POST, PUT, DELETE, GET, etc.
  eventCollection = route.method + '-' + eventCollection;

  return eventCollection;
};

KeenioMiddleware.prototype._fallbackIdentify = function (req) {
  if (req.user) {
    return req.user;
  } else if (req.session) {
    return req.session;
  }
  return {};
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

KeenioMiddleware.prototype._fallbackParseRequestBody = function (body) {
  return body;
};

KeenioMiddleware.prototype._fallbackParseResponseBody = function (body) {
  return body;
};

KeenioMiddleware.prototype._getResponseData = function (responseSendArguments) {
  var _getReaction = function (temp) {
    var reaction;
    if (helpers.isObject(temp)) {
      reaction = temp;
    } else if (helpers.isString(temp)) {
      try {
        reaction = JSON.parse(temp);
      } catch (e) {
        reaction = temp;
      }
    } else {
      reaction = temp;
    }

    return reaction;
  };

  var temp,
    reaction,
    statusCode = 200,
    data = {};

  if (responseSendArguments.length === 2) {
    statusCode = responseSendArguments[0];
    temp = responseSendArguments[1];

    reaction = _getReaction(temp);

    data.reaction = reaction;
    data.status = statusCode;
  } else {
    temp = responseSendArguments[0];

    if (helpers.isNumber(temp)) {
      statusCode = temp;

      data.status = statusCode;
    } else {
      reaction = _getReaction(temp);

      data.reaction = reaction;
      data.status = statusCode;
    }
  }

  return data;
};

KeenioMiddleware.prototype._isExcludedRoute = function (route) {
  if (this.options.excludeRoutes) {
    return routeHandler.isExcludedRoute(route, this.options.excludeRoutes);
  }
  return false;
};

KeenioMiddleware.prototype._getRouteConfig = function (route) {
  if (this.options.routes) {
    return routeHandler.getRouteConfig(route, this.options.routes);
  }
  return {};
};

KeenioMiddleware.prototype._isValidEventCollectionName = function (potentialEventCollectionName) {
  var isAscii = /^[ -~]+$/;
  if (!potentialEventCollectionName) {
    return false;
  }
  if (potentialEventCollectionName.length > 64) {
    return false;
  }
  if (!isAscii.test(potentialEventCollectionName)) {
    return false;
  }
  if (potentialEventCollectionName.indexOf('$') !== -1) {
    return false;
  }
  if (potentialEventCollectionName.charAt(0) === '_') {
    return false;
  }
  if (potentialEventCollectionName.charAt(0) === '.' || potentialEventCollectionName.charAt(potentialEventCollectionName.length - 1) === '.' ) {
    return false;
  }

  return true;
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

exports = module.exports = new KeenioMiddleware();
"use strict";

var helpers = require('./core/helpers');

var KeenEventModule = (function (options, eventEmitter) {
  this._ee = helpers.setDefaultEvents(eventEmitter, ['error', 'debug']);

  var MAX_PROPERTY_HIERARCHY_DEPTH = 10,
      MAX_STRING_LENGTH = 1000;

  this.generateEvent = function (identity, parsedRequestData, parsedResponseData, routeConfig) {
    var keenAddons = [
      {
        name: "keen:ip_to_geo",
        input: {
          "ip": "intention.ipAddress"
        },
        output: "intention.ipGeography"
      },
      {
        name: "keen:ua_parser",
        input: {
          "ua_string": "identity.userAgent"
        },
        output: "identity.parsedUserAgent"
      }
    ];

    var keenEvent = {
      identity: identity,
      intention: {
        method: parsedRequestData.method,
        path: parsedRequestData.path,
        params: parsedRequestData.params,
        body: parsedRequestData.body,
        query: parsedRequestData.query
      },
      reaction: parsedResponseData.body,
      httpStatus: parsedResponseData.status,
      environment: {
        library: 'express-keenio',
        ipAddress: '${keen.ip}',
        userAgent: '${keen.user_agent}'
      },
      keen: {
        addons: keenAddons
      }
    };

    if (parsedRequestData.referer) {
      keenEvent.intention.referer = parsedRequestData.referer;
    }

    if (routeConfig.tag) {
      keenEvent.tag = routeConfig.tag;
    }

    return this.sanitize(keenEvent);
  };

  this.sanitize = function (data) {
    this._checkPropertyDepth(data, false);

    // @todo: For performance, we're going to create a way of passing in functions to
    // ONE recursive function. This is lazy coding.
    this._checkForArraysOfObjects(data);
    this._checkForExtremelyLongStrings(data);
    this._checkForFunctions(data);

    return this._sanitizeData(data);
  };

  this._checkPropertyDepth = function (data, smite, level) {
    level = level || 1;
    smite = smite || false;

    var self = this,
        depth = level;
    
    helpers.forEach(data, function (value, key, data) {
      if (helpers.isEnumerable(value)) {
        depth = self._checkPropertyDepth(value, smite, level + 1);
      }

      if (level > MAX_PROPERTY_HIERARCHY_DEPTH) {
        var isSmiteMessage = '';
        if (smite) {
          isSmiteMessage = 'and has been smited.';
          delete data[key];
        }
        self._ee.emit('error', 'WARNING: The depth of the key (' + key + ') is greater than ' + MAX_PROPERTY_HIERARCHY_DEPTH + isSmiteMessage);
      }

      depth = Math.max(depth, level);
    });
    return depth;
  };

  this._checkForArraysOfObjects = function (data) {
    // @todo: https://github.com/sebinsua/express-keenio/issues/7
    var self = this;

    if (!helpers.isEnumerable(data)) {
      return data;
    } else {
      helpers.forEach(data, function (value, key) {
        if (helpers.isArrayOfObjects(value)) {
          self._ee.emit('debug', "WARNING: An array of objects was detected and SMITED from the event.");
          delete data[key];
        } else {
          data[key] = self._checkForArraysOfObjects(value);
        }
      });
    }

    return data;
  };

  this._checkForFunctions = function (data) {
    var self = this;

    if (!helpers.isEnumerable(data)) {
      return data;
    } else {
      helpers.forEach(data, function (value, key) {
        if (helpers.isFunction(value)) {
          self._ee.emit('error', "WARNING: The value found at property (" + key + ") is a function and has been smited.");
          delete data[key];
        } else {
          data[key] = self._checkForFunctions(value);
        }
      });
    }

    return data;
  };

  this._checkForExtremelyLongStrings = function (data) {
    var self = this;

    if (!helpers.isEnumerable(data)) {
      return data;
    } else {
      helpers.forEach(data, function (value, key) {
        if (helpers.isString(value) && value.length > MAX_STRING_LENGTH) {
          self._ee.emit('error', "WARNING: The string found at property (" + key + ") is huge and has been smited.");
          delete data[key];
        } else {
          data[key] = self._checkForExtremelyLongStrings(value);
        }
      });
    }

    return data;
  };

  this._sanitizeData = function (data) {
    var self = this;

    var PROPERTY_BLACKLIST = ['password'].concat(options && options.blacklistProperties || []),
        SMITE = "[redacted]";
    if (!helpers.isEnumerable(data)) {
      return data;
    } else {
      helpers.forEach(data, function (value, key) {
        if (PROPERTY_BLACKLIST.indexOf(key) !== -1) {
          self._ee.emit('debug', "WARNING: The property (" + key + ") is blacklisted and has been redacted.");
          value = SMITE;
        }
        if (self._isValidProperty(key)) {
          data[key] = self._sanitizeData(value);
        } else {
          self._ee.emit('error', "WARNING: The property (" + key + ") is not a valid Keen.IO property and has been smited.");
          delete data[key];
        }
      });
    }
    return data;
  };

  this._isValidProperty = function (potentialProperty) {
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
  
  return this;

}).bind({});

exports = module.exports = KeenEventModule;
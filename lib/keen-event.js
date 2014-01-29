"use strict";

var helpers = require('./core/helpers');

var KeenEventModule = (function (options, eventEmitter) {
  this._ee = helpers.setDefaultEvents(eventEmitter, ['error', 'debug']);

  var MAX_PROPERTY_HIERARCHY_DEPTH = options.defaults && options.defaults.MAX_PROPERTY_HIERARCHY_DEPTH || 10,
      MAX_STRING_LENGTH = options.defaults && options.defaults.MAX_STRING_LENGTH || 1000;

  this._setupAddons = function (addonSwitches) {
    var keenAddons = [];

    if (addonSwitches.ipToGeo) {
      keenAddons.push({
        name: "keen:ip_to_geo",
        input: {
          "ip": "identity.ipAddress"
        },
        output: "identity.ipGeography"
      });
    }
    if (addonSwitches.userAgentParser) {
      keenAddons.push({
        name: "keen:ua_parser",
        input: {
          "ua_string": "identity.userAgent"
        },
        output: "identity.parsedUserAgent"
      });
    }

    return keenAddons;
  };

  this.generateEvent = function (identity, parsedRequestData, parsedResponseData, routeConfig) {
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
        addons: this._setupAddons(options.defaults.addons)
      }
    };

    if (parsedRequestData.referer) {
      keenEvent.intention.referer = parsedRequestData.referer;
    }

    if (routeConfig.tag) {
      keenEvent.tag = routeConfig.tag;
    }

    return this.sanitize(keenEvent, routeConfig.whitelistProperties);
  };

  this.sanitize = function (data, whitelistPropertiesObject) {
    this._checkPropertyDepth(data, false);

    this._checkForNonWhitelist(data, whitelistPropertiesObject);
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

  this._checkForNonWhitelist = function (data, whitelistPropertiesObject) {
    if (whitelistPropertiesObject.query) {
      data.intention.query = this._stripNonWhitelistedProperties(data.intention.query, whitelistPropertiesObject.query);
    }
    if (whitelistPropertiesObject.body) {
      data.intention.body = this._stripNonWhitelistedDeepProperties(data.intention.body, whitelistPropertiesObject.body);
    }
    if (whitelistPropertiesObject.reaction) {
      data.reaction = this._stripNonWhitelistedDeepProperties(data.reaction, whitelistPropertiesObject.reaction);
    }

    return data;
  };

  this._stripNonWhitelistedProperties = function (data, whitelistProperties) {
    // Genuinely if this was a query, you wouldn't need to recurse, but we are going to refactor this out in a bit.
    // In fact, I might just change this into a loop... No reason to complicate at all.
    var self = this;

    var PROPERTY_WHITELIST = whitelistProperties;

    if (!helpers.isEnumerable(data)) {
      return data;
    } else {
      helpers.forEach(data, function (value, key) {
        if (PROPERTY_WHITELIST.indexOf(key) === -1) {
          self._ee.emit('debug', "WARNING: The property (" + key + ") is not in the whitelist and has been smited.");
          delete data[key];
        } else {
          data[key] = self._stripNonWhitelistedProperties(value, whitelistProperties);
        }
      });
    }

    return data;
  };

  this._stripNonWhitelistedDeepProperties = function (data, whitelistProperties, parentKey, level) {
    parentKey = parentKey || '';
    level = level || 0;

    var self = this;

    var PROPERTY_WHITELIST_AT_LEVEL = whitelistProperties.map(function (wp) {
      return wp.split('.').slice(0, level + 1).join('.');
    }).filter(helpers.identity);

    if (!helpers.isEnumerable(data)) {
      return data;
    } else {
      helpers.forEach(data, function (value, key) {
        // If a deep property exists then that means its parent keys must be whitelisted!
        var keyUpToLevel = parentKey + key;
        if (helpers.isArray(value)) {
          keyUpToLevel = keyUpToLevel + '[]';
        }
        // Recurse through building 'parentKey.' + currentKey and test if this key is in whitelistProperties.
        if (helpers.isNumber(key)) {
          data[key] = self._stripNonWhitelistedDeepProperties(value, whitelistProperties, parentKey, level + 1);
        } else if (PROPERTY_WHITELIST_AT_LEVEL.indexOf(keyUpToLevel) === -1) {
          self._ee.emit('debug', "WARNING: The property (" + key + ") is not in the whitelist and has been smited.");
          delete data[key];
        } else {
          data[key] = self._stripNonWhitelistedDeepProperties(value, whitelistProperties, keyUpToLevel + '.', level + 1);
        }
      });
    }

    return data;
  };

  this._sanitizeData = function (data) {
    var self = this;

    var PROPERTY_BLACKLIST = ['password'].concat(options && options.blacklistProperties || []);

    if (!helpers.isEnumerable(data)) {
      return data;
    } else {
      helpers.forEach(data, function (value, key) {
        if (PROPERTY_BLACKLIST.indexOf(key) !== -1) {
          self._ee.emit('debug', "WARNING: The property (" + key + ") is blacklisted and has been smited.");
          delete data[key];
        } else if (self._isValidProperty(key)) {
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
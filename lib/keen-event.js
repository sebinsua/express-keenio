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
    this._checkPropertyDepth(data, true);

    this._checkForNonWhitelist(data, whitelistPropertiesObject);

    return this._sanitizeData(data);
  };

  // This allows us to specify a max-depth of an object and ensure that any properties deeper than 
  // this are stripped out of the object.
  this._checkPropertyDepth = function (data, smite, level) {
    level = level || 1;
    smite = smite || false;

    var self = this,
        depth = level;
    
    helpers.forEach(data, function (value, key, data) {
      if (level > MAX_PROPERTY_HIERARCHY_DEPTH) {
        var isSmiteMessage = '';
        if (smite) {
          isSmiteMessage = 'and has been smited.';
          delete data[key];
        }
        self._ee.emit('error', 'WARNING: The depth of the key (' + key + ') is greater than ' + MAX_PROPERTY_HIERARCHY_DEPTH + isSmiteMessage);
      }

      if (helpers.isEnumerable(value)) {
        depth = self._checkPropertyDepth(value, smite, level + 1);
      }

      depth = Math.max(depth, level);
    });
    return depth;
  };

  // Unless the keys 'query', 'body' or 'reaction' have been specified this won't do anything.
  this._checkForNonWhitelist = function (data, whitelistPropertiesObject) {
    
    if (whitelistPropertiesObject.query) {
      data.intention.query = this._stripNonWhitelistedDeepProperties(data.intention.query, whitelistPropertiesObject.query);
    }
    if (whitelistPropertiesObject.body) {
      data.intention.body = this._stripNonWhitelistedDeepProperties(data.intention.body, whitelistPropertiesObject.body);
    }
    if (whitelistPropertiesObject.reaction) {
      data.reaction = this._stripNonWhitelistedDeepProperties(data.reaction, whitelistPropertiesObject.reaction);
    }

    return data;
  };

  // I think it makes sense to run this before the final sanitisation function, and not as a part of it.
  // I originally assumed this was used by the query whitelisting, but it later turns out that Express parses
  // queries like this ?ob[type]=man&obj[code]=seb into objects...
  this._stripNonWhitelistedProperties = function (data, whitelistProperties) {
    var self = this,
        PROPERTY_WHITELIST = whitelistProperties;

    // Genuinely in most cases if this was a query you wouldn't need to recurse, but...
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

  // This method allows the data to be stripped of deeep properties which exactly match those inside
  // the whitelistProperties array. I apologise for how complicated this got.
  this._stripNonWhitelistedDeepProperties = function (data, whitelistProperties, parentKey, level) {
    parentKey = parentKey || '';
    level = level || 0;

    var self = this;

    // If a deep property exists then that means its parent keys must be whitelisted!
    // We need to make sure that we are not deleting the property 'deep' when we have been passed 
    // a whitelist containing properties like 'deep.property.is.here' and 'deep.key'.
    // We do this by making a new property whitelist of properties up to the current level.
    var PROPERTY_WHITELIST_AT_LEVEL = whitelistProperties.map(function (wp) {
      return wp.split('.').slice(0, level + 1).join('.');
    }).filter(helpers.identity); // Filter falsey properties.

    if (!helpers.isEnumerable(data)) {
      return data;
    } else {
      helpers.forEach(data, function (value, key) {
        // The current key is not just the key we are looping through but prefixed by the parentKey.
        // We do this because we only wish to whitelist a key that matches 'deep.property.here' and
        // not a key in the root of the object like 'here'.
        var keyUpToLevel = parentKey + key;

        // If the value of the property is an array, we want to make sure it's marked as an array.
        if (helpers.isArray(value)) {
          keyUpToLevel = keyUpToLevel + '[]';
        }

        // If a key is numberic, we ignore it: the judgement is that it's part of an array
        // and we wish to allow deep properties like 'deep.array[].name' to whitelist the names of all array elements.
        if (helpers.isNumber(key)) {
          data[key] = self._stripNonWhitelistedDeepProperties(value, whitelistProperties, parentKey, level + 1);
        } else if (PROPERTY_WHITELIST_AT_LEVEL.indexOf(keyUpToLevel) === -1) {
          self._ee.emit('debug', "WARNING: The property (" + key + ") is not in the whitelist and has been smited.");
          delete data[key];
        } else {
          // We keep on recursing, passing in the currentKeyAtThisLevel + '.' into the new parentKey as well as increasing
          // the level that we are recursing at.
          data[key] = self._stripNonWhitelistedDeepProperties(value, whitelistProperties, keyUpToLevel + '.', level + 1);
        }
      });
    }

    return data;
  };

  // A list of rules are specified within, and these are acted upon the object's properties and values.
  // It will strip out the properties which are valid or that contain invalid values.
  this._sanitizeData = function (data) {
    var self = this;

    if (!helpers.isEnumerable(data)) {
      return data;
    } else {
      helpers.forEach(data, function (value, key) {
        
        var isSmitedDueToProperty = helpers.isObject(data) ? (self._checkBlacklist(value, key, data) ||
                                                              self._checkInvalidProperty(value, key, data))
                                                           : false;

        // No point in smiting the value if you have previously smited the property.
        var isSmitedDueToValue = !isSmitedDueToProperty ? (self._checkForFunctions(value, key, data) ||
                                                           self._checkForExtremelyLongStrings(value, key, data) ||
                                                           self._checkForArraysOfObjects(value, key, data))
                                                        : false;

        var isSmited = isSmitedDueToProperty || isSmitedDueToValue;
        if (!isSmited) {
          data[key] = self._sanitizeData(value);
        }
      });
    }
    return data;
  };

  this._checkBlacklist = function (value, key, data) {
    var PROPERTY_BLACKLIST = ['password'].concat(options && options.blacklistProperties || []);
    if (PROPERTY_BLACKLIST.indexOf(key) !== -1) {
      this._ee.emit('debug', "WARNING: The property (" + key + ") is blacklisted and has been smited.");
      delete data[key];
      return true;
    }

    return false;
  };

  this._checkInvalidProperty = function (value, key, data) {
    if (!this._isValidProperty(key)) {
      this._ee.emit('error', "WARNING: The property (" + key + ") is not a valid Keen.IO property and has been smited.");
      delete data[key];
      return true;
    }

    return false;
  };

  this._checkForArraysOfObjects = function (value, key, data) {
    // @todo: https://github.com/sebinsua/express-keenio/issues/7
    if (helpers.isArrayOfObjects(value)) {
      this._ee.emit('debug', "WARNING: An array of objects was found at property (" + key + ") and has been SMITED from the event.");
      delete data[key];
      return true;
    }

    return false;
  };

  this._checkForFunctions = function (value, key, data) {
    if (helpers.isFunction(value)) {
      this._ee.emit('error', "WARNING: The value found at property (" + key + ") is a function and has been smited.");
      delete data[key];
      return true;
    }

    return false;
  };

  this._checkForExtremelyLongStrings = function (value, key, data) {
    if (helpers.isString(value) && value.length > MAX_STRING_LENGTH) {
      this._ee.emit('error', "WARNING: The string found at property (" + key + ") is huge and has been smited.");
      delete data[key];
      return true;
    }

    return false;
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
"use strict";

var helpers = require('./core/helpers');

var KeenEventModule = (function (options) {

  var MAX_PROPERTY_HIERARCHY_DEPTH = 10,
      MAX_STRING_LENGTH = 1000;

  this.generateEvent = function (identity, parsedRequestData, parsedResponseData, routeConfig) {
    var keenEvent = {
      identity: identity,
      intention: {
        path: parsedRequestData.path,
        params: parsedRequestData.params,
        body: parsedRequestData.body,
        query: parsedRequestData.query,
      },
      reaction: parsedResponseData.body,
      httpStatus: parsedResponseData.status,
      environment: {
        library: 'express-keenio'
      }
    };

    if (routeConfig.tag) {
      keenEvent.tag = routeConfig.tag;
    }

    return this.sanitize(keenEvent);
  };

  this.sanitize = function (data) {
    this._checkPropertyDepth(data, false);
    this._checkForArraysOfObjects(data);
    this._checkForExtremelyLongStrings(data);

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
          isSmiteMessage = 'and it has been smited.';
          delete data[key];
        }
        // @todo: We need to parse in the object that has EventEmitter on it.
        console.warn('WARNING: The depth of the key (' + key + ') is greater than ' + MAX_PROPERTY_HIERARCHY_DEPTH + isSmiteMessage);
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
          console.warn("WARNING: An array of objects was detected and SMITED from the event.");
          delete data[key];
        } else {
          data[key] = self._checkForArraysOfObjects(value);
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
          console.warn("WARNING: The string found at property (" + key + ") is huge and has been smited.");
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

    var BAD_PROPERTIES = ['password'].concat(options && options.badProperties || []),
        SMITE = "[redacted]";
    if (!helpers.isEnumerable(data)) {
      return data;
    } else {
      helpers.forEach(data, function (value, key) {
        if (BAD_PROPERTIES.indexOf(key) !== -1) {
          value = SMITE;
        }
        if (self._isValidProperty(key)) {
          data[key] = self._sanitizeData(value);
        } else {
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
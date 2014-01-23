"use strict";

var helpers = require('./helpers');

var RequestModule = require('./request'),
    IdentifyModule = require('./identify');

var KeenEventModule = (function (options) {

  var requestHandler = new RequestModule(options);
  var identifyHandler = new IdentifyModule(options);

  this.generateEvent = function (req, parsedResponseData, routeConfig) {
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
        body: requestHandler.parseRequestBody(req),
        query: req.query,
        params: _getParams(req.route.params)
      },
      identity: identifyHandler.identify(req),
      reaction: parsedResponseData.reaction,
      status: parsedResponseData.status,
      tag: routeConfig.tag || null,
      environment: {
        library: 'express-keenio'
      }
    });

    return keenEvent;
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
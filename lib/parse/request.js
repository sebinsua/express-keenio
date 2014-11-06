"use strict";

var helpers = require('../core/helpers');

var RequestModule = (function (options, eventEmitter) {
  this._ee = helpers.setDefaultEvents(eventEmitter, []);

  var handlers = options.handlers,
      overrideParseRequestBody = !!(handlers && handlers.parseRequestBody);

  this.parseRequestObject = function (req) {
    var _getParams = function (weirdParamObject) {
      var params = {};
      if (weirdParamObject) {
        for (var paramName in weirdParamObject) {
          params[paramName] = weirdParamObject[paramName];
        }
      }
      return params;
    };

    var parsedRequestData = {
      method: req.method,
      path: req.path,
      params: req.params || _getParams(req.route.params),
      body: this.parseRequestBody(req) || {},
      query: req.query,
      referer: req.get('Referer')
    };

    return parsedRequestData;
  };

  this.parseRequestBody = function (req) {
    return this._parseRequestBody(req.body);
  };

  this._fallbackParseRequestBody = function (body) {
    return body;
  };

  // The internal method can be overridden in the options.handlers key-value object.
  this._parseRequestBody = overrideParseRequestBody ? handlers.parseRequestBody
                                                    : this._fallbackParseRequestBody;

  return this;

}).bind({});

exports = module.exports = RequestModule;

"use strict";

var helpers = require('./helpers');

var ResponseModule = (function (options) {

  var handlers = options.handlers,
      overrideParseResponseBody = !!(handlers && handlers.parseResponseBody);

  this.parseResponseBody = function (data) {
    if (helpers.isArray(data)) { // @todo: https://github.com/sebinsua/express-keenio/issues/7
      return {};
    }

    return this._parseResponseBody(data);
  };

  this._fallbackParseResponseBody = function (body) {
    return body;
  };

  this._parseResponseBody = overrideParseResponseBody ? handlers.parseResponseBody
                                                      : this._fallbackParseResponseBody;
  
  return this;

}).bind({});

exports = module.exports = ResponseModule;
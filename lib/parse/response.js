"use strict";

var helpers = require('../core/helpers');

var ResponseModule = (function (options, eventEmitter) {
  this._ee = helpers.setDefaultEvents(eventEmitter, []);
  
  var handlers = options.handlers,
      overrideParseResponseBody = !!(handlers && handlers.parseResponseBody);

  this.parseResponseBody = function (data) {
    // [@todo: express-keenio#issues/7](https://github.com/sebinsua/express-keenio/issues/7)
    if (helpers.isArray(data)) {
      return {};
    }

    return this._parseResponseBody(data);
  };

  this._fallbackParseResponseBody = function (body) {
    return body;
  };

  // The internal method can be overridden in the options.handlers key-value object.
  this._parseResponseBody = overrideParseResponseBody ? handlers.parseResponseBody
                                                      : this._fallbackParseResponseBody;
  
  return this;

}).bind({});

exports = module.exports = ResponseModule;
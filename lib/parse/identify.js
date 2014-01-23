"use strict";

var IdentifyModule = (function (options) {

  var handlers = options.handlers,
      overrideIdentify = !!(handlers && handlers.generateIdentity);

  this.identify = function (req) {
    return this._identify(req);
  };

  this._fallbackIdentify = function (req) {
    if (req.user) {
      return req.user;
    } else if (req.session) {
      return req.session;
    }
    return {};
  };

  this._identify = overrideIdentify ? handlers.generateIdentity
                                    : this._fallbackIdentify;
  
  return this;

}).bind({});

exports = module.exports = IdentifyModule;
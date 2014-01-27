"use strict";

var helpers = require('../core/helpers');

var IdentifyModule = (function (options, eventEmitter) {
  this._ee = helpers.setDefaultEvents(eventEmitter, []);

  var handlers = options.handlers,
      overrideIdentify = !!(handlers && handlers.generateIdentity);

  this.identify = function (req) {
    return this._identify(req);
  };

  this._fallbackIdentify = function (req) {
    var identity = {};
    if (req.session) {
      identity.session = helpers.extend({}, req.session);
      delete identity.session.cookie;
      identity.session.id = req.session.id;
    }
    if (req.get('User-Agent')) {
      identity.userAgent = req.get('User-Agent');
    }    
    if (req.user) {
      identity.user = req.user;
    }

    return identity;
  };

  this._identify = overrideIdentify ? handlers.generateIdentity
                                    : this._fallbackIdentify;
  
  return this;

}).bind({});

exports = module.exports = IdentifyModule;
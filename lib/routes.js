"use strict";

var helpers = require('./core/helpers');

var RoutesModule = (function (options, eventEmitter) {
  this._ee = helpers.setDefaultEvents(eventEmitter, []);

  this.isExcludedRoute = function (route) {
    var excludeRoutes = options.excludeRoutes;
    for (var i = 0; i < excludeRoutes.length; i++) {
      var excludedRoute = excludeRoutes[i];
      if (route.method === excludedRoute.method && route.path === excludedRoute.route) {
        return true;
      }
    }
    return false;
  };

  this.getRouteConfig = function (route) {
    var routes = options.routes;
    var metadata = {};
    for (var i = 0; i < routes.length; i++) {
      var includedRoute = routes[i];
      if (route.method === includedRoute.method && route.path === includedRoute.route) {
        if (includedRoute.eventCollectionName) {
          metadata.eventCollectionName = includedRoute.eventCollectionName;
        }
        if (includedRoute.tag) {
          metadata.tag = includedRoute.tag;
        }
        return metadata;
      }
    }
    return false;
  };

  return this;

}).bind({});

module.exports = RoutesModule;
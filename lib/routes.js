"use strict";

var isExcludedRoute = function (route, excludeRoutes) {
  for (var i = 0; i < excludeRoutes.length; i++) {
    var excludedRoute = excludeRoutes[i];
    if (route.method === excludedRoute.method && route.path === excludedRoute.route) {
      return true;
    }
  }
  return false;
};

var getRouteConfig = function (route, routes) {
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

module.exports = {};
module.exports.isExcludedRoute = isExcludedRoute;
module.exports.getRouteConfig = getRouteConfig;
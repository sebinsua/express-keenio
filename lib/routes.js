var isExcludedRoute = function (route, excludeRoutes) {
    for (var i = 0; i < excludeRoutes.length; i++) {
        var excludedRoute = excludeRoutes[i];
        if (route.method === excludedRoute.method &&
            route.path === excludedRoute.route) {
            return true;
        }
    }
    return false;
};

var getEventCollectionMetadataForRoute = function (route, routes) {
    for (var i = 0; i < routes.length; i++) {
        var includedRoute = routes[i];
        if (route.method === includedRoute.method &&
            route.path === includedRoute.route) {
            var metadata = {};
            ['eventCollectionName', 'tag'].forEach(function (key) {
                if (includedRoute[key]) {
                    metadata[key] = includedRoute[key] 
                }
            });
            return metadata;
        }
    }
    return false;
};

module.exports = {};
module.exports.isExcludedRoute = isExcludedRoute;
module.exports.getEventCollectionMetadataForRoute = getEventCollectionMetadataForRoute;
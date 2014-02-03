"use strict";

var EventualSchema = require('eventual-schema'),
    helpers = require('./helpers');

var hasMaximumProperties = function (eventualSchema) {
  var MAX_PROPERTIES = 100;

  return false;
};

var hasMaxInstances = function (routeSchema) {
  var NUMBER_OF_INSTANCES_BEFORE_FREEZE = 500;

  return false; 
};

var isBeyondMaxNumberOfDates = function (routeSchema) {
  var NUMBER_OF_DAYS_BEFORE_FREEZE = 3;

  return false;
};

var freezeStrategy = [hasMaxInstances, isBeyondMaxNumberOfDates, hasMaximumProperties];

// Sort by number of periods in the key.
// Sort by number of properties.
var getWhitelistStrategy = [];

// This stores a list of routes that define eventual schemas and eventually their whitelists.
function RouteSchemas(eventualSchemaOptions) {
  this.eventualSchemaOptions = eventualSchemaOptions || {};

  if (this.eventualSchemaOptions.freezeStrategy) {
    this.freezeStrategy = this.eventualSchemaOptions.freezeStrategy;
  } else {
    this.freezeStrategy = freezeStrategy;
  }

  if (this.eventualSchemaOptions.getWhitelistStrategy) {
    this.getWhitelistStrategy = this.eventualSchemaOptions.getWhitelistStrategy;
  } else {
    this.getWhitelistStrategy = getWhitelistStrategy;
  }

  this.routes = {};

  this._routeSchemaDefinition = {
    query: 'intention.query',
    body: 'intention.body',
    reaction: 'reaction'
  };
}

// Each route has three eventual schemas. An add method on the route, affects all three.
RouteSchemas.prototype.add = function (route, event) {
  if (!this._hasRoute(route)) {
    this._initRouteEventualSchemas(route);
  }

  var routeIdentifier = this._generateRouteIdentifier(route),
      schemas = Object.keys(this._routeSchemaDefinition);
  if (this.routes[routeIdentifier]) {
    var route = this.routes[routeIdentifier];
    for (var i = 0; i < schemas.length; i++) {
      if (route[schemas[i]]) {
        var partOfEventToAdd = this._routeSchemaDefinition[schemas[i]];
        switch (partOfEventToAdd) {
          case 'intention.query':
            if (event.intention && event.intention.query) {
              route[schemas[i]].add(event.intention.query);
            }
            break;
          case 'intention.body':
            if (event.intention && event.intention.body) {
              route[schemas[i]].add(event.intention.body);
            }
            break;
          case 'reaction':
            if (event.reaction) {
              route[schemas[i]].add(event.reaction);
            }
            break;
        }
      }
    }
  }
};

RouteSchemas.prototype.getWhitelist = function (route) {
  if (!this._hasRoute(route)) {
    this._initRouteEventualSchemas(route);
  }

  var whitelist = {};

  var routeIdentifier = this._generateRouteIdentifier(route),
      schemas = Object.keys(this._routeSchemaDefinition);
  if (this.routes[routeIdentifier]) {
    var route = this.routes[routeIdentifier];
    for (var i = 0; i < schemas.length; i++) {
      if (route[schemas[i]].frozen) {
        var keyWhitelist = this._generateWhitelist(route[schemas[i]]);
        whitelist[schemas[i]] = keyWhitelist;
      }
    }
  }

  return whitelist;
};

RouteSchemas.prototype._generateWhitelist = function (eventualSchema) {
  var flattenedEventualSchema = this._flattenEventualSchema(eventualSchema.get());

  var self = this;

  var sortable = [];
  helpers.forEach(flattenedEventualSchema, function (propertyCount, property) {
    sortable.push({ property: property, propertyCount: propertyCount });
  });
  sortable.sort(function (a, b) { return b.propertyCount > a.propertyCount; })

  var individualWhitelist = [];
  helpers.forEach(sortable, function (value) {
    var isKeepProperty = self.getWhitelistStrategy.reduce(function (acc, fn) {
        return !!fn && fn.apply(fn, value);
    }, true);
    if (isKeepProperty) {
        individualWhitelist.push(value.property);
    }
  });

  return individualWhitelist;
};

RouteSchemas.prototype._generateRouteIdentifier = function (route) {
  var routeMethod = route.method || 'GET', routePath = route.path || '/',
      routeIdentifier = routeMethod + ' ' + routePath;
  return routeIdentifier;
};

RouteSchemas.prototype._hasRoute = function (route) {
  var routeIdentifier = this._generateRouteIdentifier(route);

  return !!this.routes[routeIdentifier];
};

RouteSchemas.prototype._initRouteEventualSchemas = function (route) {
  var routeIdentifier = this._generateRouteIdentifier(route);

  this.routes[routeIdentifier] = {};
  this.routes[routeIdentifier].query = new EventualSchema(this.freezeStrategy);
  this.routes[routeIdentifier].body = new EventualSchema(this.freezeStrategy);
  this.routes[routeIdentifier].reaction = new EventualSchema(this.freezeStrategy);
};

// Flattens an object.
// 
// Given three of these:
// ```json
// {
//   a: {
//     num: 7,
//     arr: []
//   },
//   b: {
//      arr: [ { name: 'hey' , types: [] } ],
//      value: {
//        type: 'code',
//        name: 'hi'
//      }
//   },
//   c: { arr: [] }
// }
// ```
// Responds with this:
// ```json
// {
//   a.num: 3,
//   a.arr: 3,
//   b.arr[].name: 3,
//   b.arr[].types: 3,
//   b.value.type: 3,
//   b.value.name: 3,
//   c.arr: 3
// }
// ```
// *NOTE: objects inside arrays are shown with the `[].` syntax.*
//
// See [flat#flatten](https://github.com/hughsk/flat/blob/master/index.js#L3) which we ammended to create this.
RouteSchemas.prototype._flattenEventualSchema = function (target, propertyDelimiter, arrayIdentifier) {
  // Nested with . and []
  propertyDelimiter = propertyDelimiter || '.';
  arrayIdentifier = arrayIdentifier || '[]';

  var output = {};

  function getkey(key, prev) {
    return prev ? prev + propertyDelimiter + key : key
  };

  function step(object, prev) {
    Object.keys(object).forEach(function(key) {
      var itIsArray = helpers.isArray(object[key])
        , itIsObject = helpers.isObject(object[key])

      if (!itIsArray && itIsObject) {
        if (key === '_arrayObjects') {
          return step(object[key], prev + arrayIdentifier);
        } else {
          return step(object[key], getkey(key, prev));
        }
      }

      // We know everything which is empty still has a _propertyCount, so...
      if (Object.keys(object).length === 1) {
        output[prev] = object[key];
      }
    });
  };

  step(target)

  return output
};

exports = module.exports = RouteSchemas;
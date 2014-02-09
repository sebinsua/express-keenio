"use strict";

var EventualSchema = require('eventual-schema'),
    helpers = require('./helpers');

var path = require('path'),
    fs = require('fs');

// Core problem we are solving
// ---
// * We can't sent too many properties to Keen.IO. Dynamic properties should be avoided.
// * Definitely cannot send more than 1000 properties - try to keep it around 100 at most.
// * Nested properties are what is counted.

// How do we do this.
// ---
// * We sanity check and filter before making a request to Keen.IO.
// * We allow explicit generation of a whitelist to do the above with.
// * We also slowly build a schema which can be converted into a whitelist.

// This stores a list of routes that define eventual schemas and eventually their whitelists.
function RouteSchemas(options) {
  this.options = options || {};

  if (this.options && this.options.handlers && this.options.handlers.freezeStrategy) {
    this.freezeEventualSchemaStrategy = this.options.handlers.freezeStrategy;
  } else {
    this.freezeEventualSchemaStrategy = this._getDefaultFreezeStrategy;
  }
  this.filterWhitelistStrategy = this._getDefaultFilterWhitelistStrategy;

  this.routes = {};

  this._routeSchemaDefinition = {
    query: 'intention.query',
    body: 'intention.body',
    reaction: 'reaction'
  };

  this.cache = this.options.defaults && this.options.defaults.eventualSchemas && this.options.defaults.eventualSchemas.cache || false;
  this.cachePath = this.options.defaults && this.options.defaults.eventualSchemas && this.options.defaults.eventualSchemas.cachePath || './route-schemas.cache';
  if (this.cache) {
    this.load();
  }
}

// Each route has three eventual schemas. An add method on the route, affects all three.
RouteSchemas.prototype.add = function (route, event) {
  if (!this._hasRoute(route)) {
    this._initRouteEventualSchemas(route);
  }

  var routeIdentifier = this._generateRouteIdentifier(route),
      schemas = Object.keys(this._routeSchemaDefinition);
  
  // Clearly the route will have been setup. This test is just due to mocking _initRouteEventualSchemas in a test...
  if (this.routes[routeIdentifier]) {
    var route = this.routes[routeIdentifier];
    for (var i = 0; i < schemas.length; i++) {
      if (route[schemas[i]]) {
        var partOfEventToAdd = this._routeSchemaDefinition[schemas[i]];
        // Should not add to the frozen EventualSchemas and should make sure that the data exists for the schema.
        switch (partOfEventToAdd) {
          case 'intention.query':
            if (event.intention && event.intention.query && !route[schemas[i]].frozen) {
              route[schemas[i]].add(event.intention.query);
            }
            break;
          case 'intention.body':
            if (event.intention && event.intention.body && !route[schemas[i]].frozen) {
              route[schemas[i]].add(event.intention.body);
            }
            break;
          case 'reaction':
            if (event.reaction && !route[schemas[i]].frozen) {
              route[schemas[i]].add(event.reaction);
            }
            break;
        }
      }
    }
  }
};

// We can use this even when there is no whitelist or eventual schema existing yet
// as it will return an empty object until a key has a schema/whitelist defined.
// Non-existing keys do not act upon the data we wish to filter.
RouteSchemas.prototype.getWhitelist = function (route) {
  if (!this._hasRoute(route)) {
    this._initRouteEventualSchemas(route);
  }

  var whitelist = {};

  // These will be switched to false if they are not the case in the next 10 lines.
  var allFrozen = true;

  // This will not return with a key if the eventual schema at that key isn't frozen yet.
  var routeIdentifier = this._generateRouteIdentifier(route),
      schemas = Object.keys(this._routeSchemaDefinition);
  
  if (this.routes[routeIdentifier]) {
    var routeData = this.routes[routeIdentifier],
        isCrystallised = !!routeData.crystallised;

    if (!isCrystallised) {
      for (var i = 0; i < schemas.length; i++) {
        if (routeData[schemas[i]].frozen) {
          var keyWhitelist = this._generateWhitelist(routeData[schemas[i]], schemas[i]);
          whitelist[schemas[i]] = keyWhitelist;
        } else {
          // If any schema is not frozen, then...
          allFrozen = false;
        }
      }
    } else {
      // If crystallised, grab it.
      whitelist = routeData.crystallised;
    }

    if (allFrozen) {
      routeData.crystallised = whitelist;
      var originallyNotCrystallised = !isCrystallised;
      if (this.cache && originallyNotCrystallised) {
        this.save(route, whitelist);
      }
    }

  }

  return whitelist;
};

RouteSchemas.prototype._generateWhitelist = function (eventualSchema, schemaKey) {
  var self = this;
  var eventualSchemaOptions = self.options.defaults && self.options.defaults.eventualSchemas || {};

  var flattenedEventualSchema = this._flattenEventualSchema(eventualSchema.get()),
      sortable = [];
  helpers.forEach(flattenedEventualSchema, function (propertyCount, property) {
    sortable.push({ property: property, propertyCount: propertyCount });
  });
  sortable.sort(function (a, b) { return b.propertyCount > a.propertyCount; })

  // We only get the first MAX_PROPERTIES for a whitelist - this dictates the size of an event.
  var MAX_PROPERTIES = eventualSchemaOptions[schemaKey] && eventualSchemaOptions[schemaKey].MAX_PROPERTIES || 100;
  var individualWhitelist = [];
  for (var i = 0; i < sortable.length; i++) {
    if (i >= MAX_PROPERTIES) { break; }

    var ctx = sortable[i];
    // Test to see whether the property + propertyCount pass all of the whitelist filters. *all* must be true
    // for the property to be kept (or there must be zero whitelist checking filters.)
    var isKeepProperty = self.filterWhitelistStrategy(eventualSchemaOptions[schemaKey] || {}).reduce(function (acc, fn) {
        return !!fn && fn(ctx);
    }, true);
    if (isKeepProperty) {
        individualWhitelist.push(ctx.property);
    }
  }

  return individualWhitelist;
};

RouteSchemas.prototype._generateRouteIdentifier = function (route) {
  var routeMethod = route.method || 'get', routePath = route.path || '/',
      routeIdentifier = routeMethod + ' ' + routePath;
  return routeIdentifier;
};

RouteSchemas.prototype._hasRoute = function (route) {
  var routeIdentifier = this._generateRouteIdentifier(route);
  return !!this.routes[routeIdentifier];
};

RouteSchemas.prototype._initRouteEventualSchemas = function (route) {
  var routeIdentifier = this._generateRouteIdentifier(route);

  var eventualSchemaOptions = this.options.defaults && this.options.defaults.eventualSchemas || {};

  this.routes[routeIdentifier] = {};
  this.routes[routeIdentifier].query = new EventualSchema(this.freezeEventualSchemaStrategy(eventualSchemaOptions.query || {}));
  this.routes[routeIdentifier].body = new EventualSchema(this.freezeEventualSchemaStrategy(eventualSchemaOptions.body || {}));
  this.routes[routeIdentifier].reaction = new EventualSchema(this.freezeEventualSchemaStrategy(eventualSchemaOptions.reaction || {}));
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
  }

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

// If *any* of these rules is true, then it shall freeze.
RouteSchemas.prototype._getDefaultFreezeStrategy = function (eventualSchemaOptions) {

  var hasMaximumProperties = function (ctx) {
    // Past maximum number of properties sent to _collatedInstances.
    var MAX_PROPERTIES = eventualSchemaOptions.MAX_PROPERTIES || 100;

    return this._propertyCount >= MAX_PROPERTIES;
  };

  var hasMaxInstances = function (ctx) {
    // Past maximum number of instances sent to _collatedInstances.
    var NUMBER_OF_INSTANCES = eventualSchemaOptions.NUMBER_OF_INSTANCES || 500;

    return this._instanceCount >= NUMBER_OF_INSTANCES; 
  };

  var isBeyondExpiryDate = function (ctx) {
    // Beyond a certain number of days.
    var NUMBER_OF_DAYS = eventualSchemaOptions.NUMBER_OF_DAYS || 7;

    var expiryDate = new Date();
    expiryDate.setDate(this._instantiatedDate.getDate() + NUMBER_OF_DAYS);
    var currentDate = new Date();

    return currentDate > expiryDate;
  };

  var freezeStrategy = [hasMaxInstances, isBeyondExpiryDate, hasMaximumProperties];
  return freezeStrategy;
};

// Current defaults is to allow all properties that are produced by a frozen eventual schema.
// Current application of these means that all must be true for a property to be kept.
RouteSchemas.prototype._getDefaultFilterWhitelistStrategy = function (eventualSchemaOptions) {
  var getWhitelistStrategy = [];
  return getWhitelistStrategy;
};

RouteSchemas.prototype.save = function (route, whitelist) {
  var routeIdentifier = this._generateRouteIdentifier(route),
      cachePath = path.resolve(this.cachePath);

  var self = this;
  fs.readFile(cachePath, function (err, originalData) {
    var whitelists = {};
    if (!err) {
      try {
        whitelists = JSON.parse(originalData);
      } catch (err) { /* somebody is trying to screw with us */ }
    }
    whitelists[routeIdentifier] = whitelist;
    fs.writeFile(cachePath, JSON.stringify(whitelists), function (err) {
      if (err) {
        // If you cannot write to it, please do not try again.
        self.cache = false;
      }
    });
  });

};

RouteSchemas.prototype.load = function () {
  var cachePath = path.resolve(this.cachePath);

  var self = this;

  var whitelists;
  if (fs.existsSync(cachePath)) {
    try {
      whitelists = JSON.parse(fs.readFileSync(cachePath));
      helpers.forEach(whitelists, function (whitelist, routeIdentifier) {
        self.routes[routeIdentifier] = {};
        self.routes[routeIdentifier].crystallised = whitelist;
      });
    } catch (err) {
      // If you can't read it, do *NOT* try to write to it. Ugh.
      self.cache = false;
    }
  }

  return whitelists;
};

exports = module.exports = RouteSchemas;
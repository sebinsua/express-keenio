// I have a list of routes which define eventual schemas and their whitelists.
// I need a way of adding a route and its related schemas.
// I need a way of maintaining eventual schemas for each. Each route has three eventual schemas. An add method on the route, affects all three.
// I need a way of getting out the eventual schema of a route if it already exists.
// I need a way of converting an eventual schema into a whitelist representation like this:
// [ 'a.num', 'a.arr', 'b.arr[].name', 'b.arr[].types', 'b.value.type', 'b.value.name', 'c.arr' ]

// I need a way of saving this information (collated instances *OR* eventual schema *OR* whitelist) to disk.
// I need a way of loading this information (collated instances *OR* eventual schema *OR* whitelist) into a series of routes eventual schema objects.

/*
todo: Move to the route thing in keenio.
EventualSchema.prototype._flattenProperties = function (obj, propertyDelimiter, arrayIdentifier) {
    // Nested with . and []
    delimiter = delimiter || '.';
    arrayIdentifier = arrayIdentifier || '[]';
};
*/

/*
todo: move to the route thing in keenio.

We don't create something like this (yet.):

{
    a.num: { _propertyCount: 3 },
    a.arr: { _propertyCount: 3 },
    b.arr[].name: { _propertyCount: 3 },
    b.arr[].types: { _propertyCount: 3 },
    b.value.type: { _propertyCount: 3 },
    b.value.name: { _propertyCount: 3 },
    c.arr: { _propertyCount: 3 }
}

// The will be injected in anyways.
var hasMaximumProperties = function (eventualSchema) {
  var MAX_PROPERTIES = 30;
};

var isAboveMinPropertyCount = function (eventualSchema) {
  var MIN_PROPERTY_QUANTITY = 1;
};

var hasMaxInstances = function (routeSchema) {
  var NUMBER_OF_INSTANCES_BEFORE_FREEZE = 500;    
};

var isBeyondMaxNumberOfDates = function (routeSchema) {
  var NUMBER_OF_DAYS_BEFORE_FREEZE = 7;
};

describe('#_flattenProperties', function () {

  it('should flatten properties given a nested object', function () {

  });

  it('should flatten properties including arrays with a special notation given a nested object', function () {

  });

});
*/
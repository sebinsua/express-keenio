"use strict";

var noop = function () {};
var identity = function (i) { return !!i; }

var isFunction = function (value) { return Object.prototype.toString.call(value) === '[object Function]'; }
var isObject = function (value) { return Object.prototype.toString.call(value) === '[object Object]'; };
var isArray = function (value) { return Object.prototype.toString.call(value) === '[object Array]'; };
var isEnumerable = function (value) { return isArray(value) || isObject(value); };
var isString = function (value) { return Object.prototype.toString.call(value) === '[object String]'; };
var isNumber = function (value) { return Object.prototype.toString.call(value) === '[object Number]'; };

var isArrayOfObjects = function (value) {
  return !!(isArray(value) && value.length && value.every(function (item) { return item && isObject(item); }));
};

// See [underscore#forEach](http://underscorejs.org/docs/underscore.html#section-13)
var forEach = function (obj, iterator, context) {
  var nativeForEach = Array.prototype.forEach,
      breaker = {};

  var i, length;
  if (obj === null) return;
  if (nativeForEach && obj.forEach === nativeForEach) {
    obj.forEach(iterator, context);
  } else if (obj.length === +obj.length) {
    for (i = 0, length = obj.length; i < length; i++) {
      if (iterator.call(context, obj[i], i, obj) === breaker) return;
    }
  } else {
    var keys = Object.keys(obj);
    for (i = 0, length = keys.length; i < length; i++) {
      if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
    }
  }
};

// See [underscore#extend](http://underscorejs.org/docs/underscore.html#section-78)
var extend = function (obj) {
  var nativeSlice = Array.prototype.slice;
  forEach(nativeSlice.call(arguments, 1), function (source) {
    if (source) {
      for (var prop in source) {
        obj[prop] = source[prop];
      }
    }
  });
  return obj;
};

var setDefaultEvents = function (eventEmitter, events) {
  for (var ie = 0; ie < events.length; ie++) {
    var eventName = events[ie];
    if (eventEmitter.listeners(eventName).length === 0) {
      eventEmitter.on(eventName, noop);
    }
  }
  return eventEmitter;
};

module.exports = {};
module.exports.isFunction = isFunction;
module.exports.isObject = isObject;
module.exports.isArray = isArray;
module.exports.isEnumerable = isEnumerable;
module.exports.isString = isString;
module.exports.isNumber = isNumber;

module.exports.isArrayOfObjects = isArrayOfObjects;

module.exports.noop = noop;
module.exports.identity = identity;
module.exports.forEach = forEach;
module.exports.extend = extend;

module.exports.setDefaultEvents = setDefaultEvents;

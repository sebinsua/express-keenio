var noop = function () {};

var isObject = function (value) { return Object.prototype.toString.call(value) === '[object Object]'; };
var isArray = function (value) { return Object.prototype.toString.call(value) === '[object Array]'; };
var isEnumerable = function (value) { return isArray(value) || isObject(value); }; 
var isString = function (value) { return Object.prototype.toString.call(value) === '[object String]'; };
var isNumber = function (value) { return Object.prototype.toString.call(value) === '[object Number]'; };

var forEach = function (obj, iterator, context) {
    // Borrowing: http://underscorejs.org/docs/underscore.html#section-13
    var nativeForEach = Array.prototype.forEach,
        breaker = {};

    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
        obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
        for (var i = 0, length = obj.length; i < length; i++) {
            if (iterator.call(context, obj[i], i, obj) === breaker) return;
        }
    } else {
        var keys = Object.keys(obj);
        for (var i = 0, length = keys.length; i < length; i++) {
            if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
        }
    }
};
var extend = function(obj) {
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

module.exports = {};
module.exports.isObject = isObject;
module.exports.isArray = isArray;
module.exports.isEnumerable = isEnumerable;
module.exports.isString = isString;
module.exports.isNumber = isNumber;

module.exports.noop = noop;
module.exports.forEach = forEach;
module.exports.extend = extend;
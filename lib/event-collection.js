"use strict";

var helpers = require('./core/helpers');

var EventCollectionModule = (function (options, eventEmitter) {
  this._ee = helpers.setDefaultEvents(eventEmitter, []);

  var handlers = options.handlers,
      overrideGenerateEventCollectionName = !!(handlers && handlers.generateEventCollectionName);
                                                         
  this.generateName = function (route) {
    return this._generateName(route);
  };

  this._fallbackEventCollectionName = function (route) {
    var eventCollection;
    eventCollection = route.path.replace(/\//g, "-");
    eventCollection = eventCollection.charAt(0) === '-' ? eventCollection.slice(1) : eventCollection;
    // We have keys - and know which are optional - and which we received data for. We could do more...
    eventCollection = eventCollection.replace(/:/g, '');
    if (eventCollection.length === 0) { // If we were accessing the empty path then...
      eventCollection = 'root';
    }
    // Make sure we separate on POST, PUT, DELETE, GET, etc.
    eventCollection = route.method + '-' + eventCollection;

    return eventCollection;
  };

  this._isValidEventCollectionName = function (potentialEventCollectionName) {
    var isAscii = /^[ -~]+$/;
    if (!potentialEventCollectionName) {
      return false;
    }
    if (potentialEventCollectionName.length > 64) {
      return false;
    }
    if (!isAscii.test(potentialEventCollectionName)) {
      return false;
    }
    if (potentialEventCollectionName.indexOf('$') !== -1) {
      return false;
    }
    if (potentialEventCollectionName.charAt(0) === '_') {
      return false;
    }
    if (potentialEventCollectionName.charAt(0) === '.' || potentialEventCollectionName.charAt(potentialEventCollectionName.length - 1) === '.' ) {
      return false;
    }

    return true;
  };

  this._generateName = overrideGenerateEventCollectionName ? handlers.generateEventCollectionName
                                                           : this._fallbackEventCollectionName;
  
  return this;

}).bind({});

module.exports = EventCollectionModule;
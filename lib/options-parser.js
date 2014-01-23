"use strict";
var helpers = require('./helpers'),
    defaultOptions = require('./default-options');

var OptionsParser = function () {
  this._defaultOptions = defaultOptions || {};
};

OptionsParser.prototype._validate = function (options) {
  if (!options) {
    throw new Error("No options specified for the keen.io middleware.");
  }

  if (!options.client) {
    throw new Error("No client options specified for the keen.io middleware.");
  }

  var mandatoryOptions = ['projectId', 'writeKey'];
  mandatoryOptions.forEach(function (option) {
    var hasMandatoryOption = !! options.client[option];
    if (!hasMandatoryOption) {
      throw new Error(option + " is missing from the client options passed into the keen.io middleware and was mandatory.");
    }
  });

  var configKeys = Object.keys(options);
  var eitherRoutesDefinedOrExcluded = (configKeys.indexOf('routes') !== -1 && configKeys.indexOf('excludeRoutes') !== -1);
  if (eitherRoutesDefinedOrExcluded) {
    // Either one or the other must be specified, but not both.
    throw new Error("You must only specify routes or excludeRoutes, never both.");
  }
};

OptionsParser.prototype.parse = function (options) {
  this._validate(options);
  return helpers.extend({}, this._defaultOptions, options);
};

module.exports = new OptionsParser();
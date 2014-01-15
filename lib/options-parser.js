var OptionsParser = function () {};
OptionsParser.prototype.parse = function (options) {
    var testForClientOptions = function (options) {
        var mandatoryOptions = ['projectId', 'writeKey'];
        mandatoryOptions.forEach(function (option) {
            var hasMandatoryOption = !!options.client[option];
            if (!hasMandatoryOption) {
                throw new Error(option + " is missing from the client options passed into the keen.io middleware and was mandatory.");
            }
        });
    };
    
    if (!options) {
        throw new Error("No options specified for the keen.io middleware.")
    } else {
        if (options.client) {
            testForClientOptions(options);
        } else {
            throw new Error("No client options specified for the keen.io middleware.");
        }

        var configKeys = Object.keys(options);
        if ((configKeys.indexOf('routes') !== -1 && configKeys.indexOf('excludeRoutes') !== -1)) {
            // Either one or the other must be specified, but not both.
            throw new Error("You must only specify routes or excludeRoutes, never both.")
        }
    }

    return options;
};

module.exports = new OptionsParser();
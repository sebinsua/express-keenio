var keen = require("keen.io");

var keenioMiddleware = function (options) {

    var mandatoryOptions = ['projectId', 'writeKey'];
    if (!options) {
        throw new Error("No options specified for the keen.io middleware.")
    } else {
        mandatoryOptions.forEach(function (option) {
            var hasMandatoryOption = !!options[option];
            if (!hasMandatoryOption) {
                throw new Error(option + " is missing from the options passed into the keen.io middleware and was mandatory.");
            }
        });
    }

    var keenClient = keen.configure(options);

    return function (req, res, next) {
        var eventCollection, keenEvent, _intention, _reaction;

        _intention = {
            path: req.path,
            query: req.query,
            body: req.body
        };

        res.on("finish", function () {
            // This is a relatively sensible place to send the event onto keen.io.
            eventCollection = 'api-' + _intention.path.replace(/[^a-zA-Z0-9]+/, "-");
            _reaction = {

            };
            keenEvent = {
                intention: _intention,
                reaction: _reaction
            };

            keenClient.addEvent(eventCollection, keenEvent, function (err, res) {
                console.log(res);
                console.log(err);
            });
        });

        next();
    };
};

exports = module.exports = keenioMiddleware;
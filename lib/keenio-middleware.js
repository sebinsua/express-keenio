var keen         = require("keen.io"),
    EventEmitter = require('events').EventEmitter;

var KeenioMiddleware = function () {
    EventEmitter.call(this);
};

KeenioMiddleware.prototype._parseOptions = function (options) {
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

    return options;
};

KeenioMiddleware.prototype.all = function () {
    var allMiddlewareScope = this;
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

            allMiddlewareScope.keenClient.addEvent(eventCollection, keenEvent, function (err, res) {
                console.log(res);
                console.log(err);
            });
        });

        next();
    };
};

KeenioMiddleware.prototype.configure = function (options) {
    this.options = this._parseOptions(options)
    this.keenClient = keen.configure(options);
};

exports = module.exports = new KeenioMiddleware();
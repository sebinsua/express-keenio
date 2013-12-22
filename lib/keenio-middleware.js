var keen         = require("keen.io"),
    EventEmitter = require('events').EventEmitter;

// @todo: For the actual keen.io client library to add in batching.

// @todo: Abstract a Handler, Request and Response parser.

// @todo: Remove comments by making them event emitted by noop by default.
var noop = function () {};

var KeenioMiddleware = function () {
    EventEmitter.call(this);
};

KeenioMiddleware.prototype.handle = function () {
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
KeenioMiddleware.prototype.handleAll = KeenioMiddleware.prototype.handle;

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

KeenioMiddleware.prototype.configure = function (options) {
    this.options = this._parseOptions(options)
    this.keenClient = keen.configure(options);
};

exports = module.exports = new KeenioMiddleware();
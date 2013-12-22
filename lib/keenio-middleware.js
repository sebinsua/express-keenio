var util         = require('util'),
    keen         = require('keen.io'),
    EventEmitter = require('events').EventEmitter;

var noop = function () {};

// @todo: Fork the actual keen.io client library to add in batching.
// @todo: Abstract a Handler, Identify, Request, Response parser.

function KeenioMiddleware () {
    EventEmitter.call(this);
    this.on("error", noop);
};
util.inherits(KeenioMiddleware, EventEmitter);

KeenioMiddleware.prototype.handle = function () {
    if (!this.options) {
        throw new Error("Middleware must be configured before use.");
    }

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

KeenioMiddleware.prototype.configure = function (options) {
    this.options = this._parseOptions(options)
    this.keenClient = keen.configure(options.client);
};

KeenioMiddleware.prototype._parseOptions = function (options) {
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
    } else if (!options.client) {
        throw new Error("No client options specified for the keen.io middleware.")
    } else {
        testForClientOptions(options);
    }

    return options;
};

exports = module.exports = new KeenioMiddleware();
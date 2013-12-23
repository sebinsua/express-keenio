var util         = require('util'),
    keen         = require('keen.io'),
    EventEmitter = require('events').EventEmitter;

var noop = function () {};
var isObject = function (value) { return typeof value === 'object'; };

// @todo: Fork the actual keen.io client library to add in batching.
// @todo: Abstract a Handler, Identify, Request, Response parser.

function KeenioMiddleware () {
    EventEmitter.call(this);
    this.on("error", noop);
};
util.inherits(KeenioMiddleware, EventEmitter);

KeenioMiddleware.prototype.configure = function (options) {
    this.options = this._parseOptions(options)
    this.keenClient = keen.configure(options.client);
};

KeenioMiddleware.prototype.handle = function (eventCollectionName, eventTag) {
    if (!this.options) {
        throw new Error("Middleware must be configured before use.");
    }

    return this._handle({
        eventCollectionName: eventCollectionName,
        eventTag: eventTag
    });
};

KeenioMiddleware.prototype.handleAll = function () {
    if (!this.options) {
        throw new Error("Middleware must be configured before use.");
    }

    return this._handle({});
};

KeenioMiddleware.prototype._handle = function (options) {
    var handleMiddlewareScope = this;
    return function keenioHandler (req, res, next) {
        var eventCollection, keenEvent, _trackedIdentity, _intention, _reaction;

        _trackedIdentity = handleMiddlewareScope._identify(req);
        _intention = {
            path: req.path,
            query: req.query,
            body: req.body
        };

        var responseSend = res.send;
        res.send = function (data) {
            if (isObject(data)) {
                _reaction = data;
            }
            responseSend.apply(res, arguments);
        };
        res.on("finish", function () {
            // This is a relatively sensible place to send the event onto keen.io.
            eventCollection = options.eventCollectionName 
                            ? options.eventCollectionName
                            : 'api-' + _intention.path.replace(/[^a-zA-Z0-9]+/, "-");

            keenEvent = {
                intention: _intention,
                reaction: _reaction
            };
            if (_trackedIdentity) {
                keenEvent.user = _trackedIdentity;
            }
            if (options.eventTag) {
                keenEvent.tag = options.eventTag;
            }

            handleMiddlewareScope.keenClient.addEvent(eventCollection, keenEvent, function (err, res) {
                console.log(res);
                console.log(err);
            });
        });

        next();
    };
};

KeenioMiddleware.prototype._identify = function (req) {
    if (req.user) {
        return req.user;
    } else if (req.session) {
        return req.session;
    } else {
        return req.headers;
    }
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
var util         = require('util'),
    keen         = require('keen.io'),
    EventEmitter = require('events').EventEmitter;

var noop = function () {};
var isObject = function (value) { return typeof value === 'object'; };

// @todo: Find out what keen.io does if it receives an array...?!
// @todo: Fork the actual keen.io client library to add in batching.
// @todo: Abstract things: Handler, Identify, Request, R esponse parser.

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

    return this._handle();
};

KeenioMiddleware.prototype._handle = function (props) {
    var middlewareOptions = this.options;
    props = props || {};

    var handleMiddlewareScope = this;
    return function keenioHandler (req, res, next) {
        var eventCollection, keenEvent, _trackedIdentity, _intention, _reaction;

        if (req.is('application/json')) {
            _intention = {
                path: req.path,
                body: req.body,
                query: req.query,
                params: {}
            };
            keenEvent = {};
            keenEvent.intention = _intention;
            if (middlewareOptions.identify) {
                _trackedIdentity = handleMiddlewareScope._identify(req);
                keenEvent.identity = _trackedIdentity;
            }
            if (props.eventTag) {
                keenEvent.tag = props.eventTag;
            }

            var responseSend = res.send;
            res.send = function (data) {
                if (isObject(data)) {
                    _reaction = data;
                }
                responseSend.apply(res, arguments);
            };

            res.on("finish", function () {
                // This is a relatively sensible place to send the event onto keen.io.
                eventCollection = props.eventCollectionName 
                                ? props.eventCollectionName
                                : 'api-' + _intention.path.replace(/[^a-zA-Z0-9]+/, "-");

                // req will now have the express route bound to it.
                // This is an implementation detail of express - but it makes the hack possible!
                if (req.route.params) {
                    for (var paramName in req.route.params) {
                        keenEvent.intention.params[paramName] = req.route.params[paramName];
                    }
                }
                keenEvent.reaction = _reaction;

                handleMiddlewareScope.keenClient.addEvent(eventCollection, keenEvent, function (err, res) {
                    console.log(res);
                    console.log(err);
                });
            });
        }

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
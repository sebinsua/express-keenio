var util         = require('util'),
    keen         = require('keen.io'),
    EventEmitter = require('events').EventEmitter;

var noop = function () {};
var isObject = function (value) { return Object.prototype.toString.call(value) === '[object Object]'; };
var isNumber = function (value) { return Object.prototype.toString.call(value) === '[object Number]'; };
var isString = function (value) { return Object.prototype.toString.call(value) === '[object String]'; };
var isArray = function (value) { return Object.prototype.toString.call(value) === '[object Array]'; };

// @todo: Find out what keen.io does if it receives an array...?!
// @todo: Fork the actual keen.io client library to add in batching.
// @todo: Abstract things: Handler, Identify, Request, Response parser.

function KeenioMiddleware () {
    EventEmitter.call(this);
    this.on("error", noop); // @todo: not sensible long-term decision, bro.
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

    // @todo: We should move this shit into the handleAll() and handle().
    var generateDefaultEventCollectionName = this.options && this.options.defaults && this.options.defaults.generateEventCollectionName
                                           ? this.options.defaults.generateEventCollectionName
                                           : this._generateDefaultEventCollectionName;

    var handleMiddlewareScope = this;
    return function keenioHandler (req, res, next) {
        var eventCollection, keenEvent, _trackedIdentity, _intention, _status, _reaction;

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
            res.send = function (/* arguments */) {
                var responseData = handleMiddlewareScope._getResponseData(arguments);

                _reaction = responseData.reaction;
                _status = responseData.status;

                responseSend.apply(res, arguments);
            };

            res.on("finish", function () {
                // This is a relatively sensible place to send the event onto keen.io.
                eventCollection = props.eventCollectionName 
                                ? props.eventCollectionName 
                                : generateDefaultEventCollectionName(req.route);

                // req will now have the express route bound to it.
                // This is an implementation detail of express - but it makes the hack possible!
                if (req.route.params) {
                    for (var paramName in req.route.params) {
                        keenEvent.intention.params[paramName] = req.route.params[paramName];
                    }
                }
                keenEvent.reaction = _reaction;
                keenEvent.status = _status;

                handleMiddlewareScope.keenClient.addEvent(eventCollection, keenEvent, function (err, res) {
                    if (err) {
                        handleMiddlewareScope.on("error", err);
                    }
                    console.log(res);
                });
            });
        }

        next();
    };
};

KeenioMiddleware.prototype._generateDefaultEventCollectionName = function (route) {
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

KeenioMiddleware.prototype._getResponseData = function (responseSendArguments) {
    var _getReaction = function (temp) {
        var reaction;
        if (isObject(temp)) {
            reaction = temp;
        } else if (isString(temp)) {
            try {
                reaction = JSON.parse(temp);
            } catch (e) {
                reaction = temp;
            }
        } else {
            reaction = temp;
        }

        return reaction;
    };

    var temp,
        reaction,
        statusCode = 200,
        data = {};

    if (responseSendArguments.length === 2) {
        statusCode = responseSendArguments[0];
        temp = responseSendArguments[1];
        
        reaction = _getReaction(temp);

        data.reaction = reaction;
        data.status = statusCode;
    } else {
        temp = responseSendArguments[0];

        if (isNumber(temp)) {
            statusCode = temp;

            data.status = statusCode;
        } else {
            reaction = _getReaction(temp);

            data.reaction = reaction;
            data.status = statusCode;
        }
    }

    return data;
}

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
var util         = require('util'),
    keen         = require('keen.io'),
    EventEmitter = require('events').EventEmitter;

// @todo: Fork the actual keen.io client library to add in batching.

var noop = function () {};

var isObject = function (value) { return Object.prototype.toString.call(value) === '[object Object]'; };
var isArray = function (value) { return Object.prototype.toString.call(value) === '[object Array]'; };
var isEnumerable = function (value) { return isArray(value) || isObject(value); }; 
var isString = function (value) { return Object.prototype.toString.call(value) === '[object String]'; };
var isNumber = function (value) { return Object.prototype.toString.call(value) === '[object Number]'; };

var forEach = function (obj, iterator, context) {
    // Borrowing: http://underscorejs.org/docs/underscore.html#section-13
    var nativeForEach = Array.prototype.forEach,
        breaker = {};

    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
        obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
        for (var i = 0, length = obj.length; i < length; i++) {
            if (iterator.call(context, obj[i], i, obj) === breaker) return;
        }
    } else {
        var keys = Object.keys(obj);
        for (var i = 0, length = keys.length; i < length; i++) {
            if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
        }
    }
};

function KeenioMiddleware () {
    EventEmitter.call(this);
    this.on("error", noop); // @todo: not sensible long-term decision, bro.
};
util.inherits(KeenioMiddleware, EventEmitter);

KeenioMiddleware.prototype.configure = function (options) {
    this.options = this._parseOptions(options);
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
        var eventCollection, keenEvent, _trackedIdentity, _intention, _status, _reaction;

        // @todo: Switch parsing depending on whether you were sent json or plain text, etc.
        if (req.is('application/json')) {
            var responseSend = res.send;
            res.send = function (/* arguments */) {
                var responseData = handleMiddlewareScope._getResponseData(arguments);

                _reaction = handleMiddlewareScope.parseResponseBody(responseData.reaction);
                _status = responseData.status;

                responseSend.apply(res, arguments);
            };

            res.on("finish", function () {
                var route = req.route,
                    eventCollectionMetadata;

                if (handleMiddlewareScope._isExcludedRoute(route)) {
                    return false;
                }

                eventCollectionMetadata = handleMiddlewareScope._getEventCollectionMetadataForRoute(route);
                if (eventCollectionMetadata) {
                    if (eventCollectionMetadata.eventCollectionName) {
                        props.eventCollectionName = eventCollectionMetadata.eventCollectionName;
                    }
                    if (eventCollectionMetadata.tag) {
                        props.eventTag = eventCollectionMetadata.tag;
                    }
                } else {
                    if (eventCollectionMetadata === false) {
                        return false;
                    }
                }

                eventCollection = props.eventCollectionName 
                                ? props.eventCollectionName 
                                : handleMiddlewareScope.generateEventCollectionName(req.route);

                _intention = {
                    path: req.path,
                    body: handleMiddlewareScope.parseRequestBody(req.body),
                    query: req.query,
                    params: {}
                };
                keenEvent = {};
                keenEvent.intention = _intention;
                if (middlewareOptions.defaults && middlewareOptions.defaults.generateIdentity) {
                    _trackedIdentity = handleMiddlewareScope.identify(req);
                    keenEvent.identity = _trackedIdentity;
                }
                if (props.eventTag) {
                    keenEvent.tag = props.eventTag;
                }

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

KeenioMiddleware.prototype._isExcludedRoute = function (route) {
    if (this.options.excludeRoutes) {
        for (var i = 0; i < this.options.excludeRoutes.length; i++) {
            var excludedRoute = this.options.excludeRoutes[i];
            if (route.method === excludedRoute.method &&
                route.path === excludedRoute.route) {
                return true;
            }
        }
        return false;
    }
    return false;
};

KeenioMiddleware.prototype._getEventCollectionMetadataForRoute = function (route) {
    if (this.options.routes) {
        for (var i = 0; i < this.options.routes.length; i++) {
            var includedRoute = this.options.routes[i];
            if (route.method === includedRoute.method &&
                route.path === includedRoute.route) {
                var metadata = {};
                ['eventCollectionName', 'tag'].forEach(function (key) {
                    if (includedRoute[key]) {
                        metadata[key] = includedRoute[key] 
                    }
                });
                return metadata;
            }
        }
        return false;
    }
    return undefined;
};

KeenioMiddleware.prototype.generateEventCollectionName = function (route) {
    if (this.options && this.options.defaults && this.options.defaults.generateEventCollectionName) {
        return this.options.defaults.generateEventCollectionName(route);
    } else {
        return this._fallbackEventCollectionName(route);
    }
};

KeenioMiddleware.prototype._fallbackEventCollectionName = function (route) {
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

KeenioMiddleware.prototype.identify = function (req) {
    if (this.options && this.options.defaults && this.options.defaults.generateIdentity) {
        return this.options.defaults.generateIdentity(req);
    } else {
        return this._fallbackIdentify(req);
    }
};

KeenioMiddleware.prototype.parseRequestBody = function (body) {
    if (this.options && this.options.defaults && this.options.defaults.parseRequestBody) {
        return this.options.defaults.parseRequestBody(body);
    } else {
        return this._fallbackParseRequestBody(body);
    }
};

KeenioMiddleware.prototype.parseResponseBody = function (body) {
    if (this.options && this.options.defaults && this.options.defaults.parseResponseBody) {
        return this.options.defaults.parseResponseBody(body);
    } else {
        return this._fallbackParseResponseBody(body);
    }
};

KeenioMiddleware.prototype._fallbackIdentify = function (req) {
    if (req.user) {
        return req.user;
    } else if (req.session) {
        return req.session;
    }
    return {};
};

KeenioMiddleware.prototype._sanitizeBody = function (body) {
    var keenioMiddlewareScope = this;

    var BAD_KEYS = ['password'],
        SMITE = "[redacted]";
    if (!isEnumerable(body)) {
        return body;
    } else {
        forEach(body, function (value, key) {
            if (BAD_KEYS.indexOf(key) !== -1) {
                value = SMITE;
            }
            body[key] = keenioMiddlewareScope._sanitizeBody(value);
        });
    }
    return body;
};

KeenioMiddleware.prototype._fallbackParseRequestBody = function (body) {
    return this._sanitizeBody(body);
};

KeenioMiddleware.prototype._fallbackParseResponseBody = function (body) {
    return this._sanitizeBody(body);    
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

exports = module.exports = new KeenioMiddleware();
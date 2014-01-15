var util          = require('util'),
    keen          = require('keen.io'),
    EventEmitter  = require('events').EventEmitter;

var helpers       = require('./helpers'),
    optionsParser = require('./options-parser'),
    routeHandler  = require('./routes');

// @todo: Find out why response 'finish' event is executed twice with req.route set once and without.
// @todo: Fork the actual keen.io client library to add in batching.
// ---
// @todo: REFACTOR!
// @todo: Write some code to ensure that handleAll config gets overridden by individual middleware functions and not the other way around.

function KeenioMiddleware () {
    EventEmitter.call(this);
    this.on("error", console.log);
    this.on("info", helpers.noop);
};
util.inherits(KeenioMiddleware, EventEmitter);

KeenioMiddleware.prototype.configure = function (options) {
    this.options = optionsParser.parse(options);
    this.keenClient = keen.configure(options.client);
};

KeenioMiddleware.prototype.handle = function (eventCollectionName, eventTag) {
    if (!this.options) {
        throw new Error("Middleware must be configured before use.");
    }

    return this._generateHandler({
        eventCollectionName: eventCollectionName,
        tag: eventTag
    });
};

KeenioMiddleware.prototype.handleAll = function () {
    if (!this.options) {
        throw new Error("Middleware must be configured before use.");
    }

    return this._generateHandler({});
};

KeenioMiddleware.prototype._generateHandler = function (props) {
    var handleMiddlewareScope = this,
        middlewareOptions = this.options;

    return function keenioHandler (req, res, next) {
        var eventCollection, keenEvent, _status, _reaction;

        var responseSend = res.send;
        res.send = function (/* arguments */) {
            var responseData = handleMiddlewareScope._getResponseData(arguments);

            _reaction = handleMiddlewareScope.parseResponseBody(responseData.reaction);
            _status = responseData.status;

            responseSend.apply(res, arguments);
        };

        res.on("finish", function () {
            var route = req.route; // req will now have the express route bound to it.
            if (!route || handleMiddlewareScope._isExcludedRoute(route)) {
                return false;
            }

            var eventCollectionMetadata = handleMiddlewareScope._getEventCollectionMetadataForRoute(route);
            if (eventCollectionMetadata === false) {
                return false;
            }
            props = helpers.extend(eventCollectionMetadata, props);

            eventCollection = props.eventCollectionName 
                            ? props.eventCollectionName 
                            : handleMiddlewareScope.generateEventCollectionName(route);
            
            var _getParams = function (weirdParamObject) {
                var params = {};
                if (weirdParamObject) {
                    for (var paramName in weirdParamObject) {
                        params[paramName] = weirdParamObject[paramName];
                    }
                }
                return params;
            };
            keenEvent = {
                intention: {
                    path: req.path,
                    body: handleMiddlewareScope.parseRequestBody(req.body),
                    query: req.query,
                    params: _getParams(route.params)
                },
                identity: handleMiddlewareScope.identify(req),
                reaction: _reaction,
                status: _status,
                tag: props.tag
            };

            handleMiddlewareScope.keenClient.addEvent(eventCollection, keenEvent, function (err, res) {
                if (err) {
                    handleMiddlewareScope.emit("error", err);
                }
                handleMiddlewareScope.emit("info", res);
            });
        });

        next();
    };    
}

KeenioMiddleware.prototype.generateEventCollectionName = function (route) {
    if (this.options && this.options.defaults && this.options.defaults.generateEventCollectionName) {
        return this.options.defaults.generateEventCollectionName(route);
    } else {
        return this._fallbackEventCollectionName(route);
    }
};

KeenioMiddleware.prototype.identify = function (req) {
    if (this.options && this.options.defaults && this.options.defaults.generateIdentity) {
        return this.options.defaults.generateIdentity(req);
    } else {
        return this._fallbackIdentify(req);
    }
};

KeenioMiddleware.prototype.parseRequestBody = function (body) {
    // @todo: Switch parsing depending on whether you were sent json or plain text, etc.
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
    if (!helpers.isEnumerable(body)) {
        return body;
    } else {
        helpers.forEach(body, function (value, key) {
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

KeenioMiddleware.prototype._getResponseData = function (responseSendArguments) {
    var _getReaction = function (temp) {
        var reaction;
        if (helpers.isObject(temp)) {
            reaction = temp;
        } else if (helpers.isString(temp)) {
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

        if (helpers.isNumber(temp)) {
            statusCode = temp;

            data.status = statusCode;
        } else {
            reaction = _getReaction(temp);

            data.reaction = reaction;
            data.status = statusCode;
        }
    }

    return data;
};

KeenioMiddleware.prototype._isExcludedRoute = function (route) {
    if (this.options.excludeRoutes) {
        return routeHandler.isExcludedRoute(route, this.options.excludeRoutes);
    }
    return false;
};

KeenioMiddleware.prototype._getEventCollectionMetadataForRoute = function (route) {
    if (this.options.routes) {
        return routeHandler.getEventCollectionMetadataForRoute(route, this.options.routes);
    }
    return {};
};

exports = module.exports = new KeenioMiddleware();
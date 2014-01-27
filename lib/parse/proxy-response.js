"use strict";

var helpers = require('../core/helpers');

var ResponseModule = require('./response');

var ProxyResponseModule = (function (options, eventEmitter) {
  this._ee = helpers.setDefaultEvents(eventEmitter, []);
    
  var responseHandler = new ResponseModule(options);
  
  // Data can be a string, a json string, or an object.
  var _getBody = function (temp) {
    var body;
    if (helpers.isObject(temp)) {
      // If an object was passed in, this is the body.
      body = temp;
    } else if (helpers.isString(temp)) {
      // If a string was passed in, we check to see whether it was json
      // by parsing it and get this data out if possible. Otherwise it's a string.
      try {
        body = JSON.parse(temp);
      } catch (e) {
        body = temp;
      }
    } else {
      body = temp;
    }

    return body;
  };

  // This is only for use by methods that follow the argument patterns:
  // - (status, data)
  // - (status)
  // - (data)
  // - (body, status) compatability
  var _captureResponseData = function (argumentsObj, resStatus) {
    var body, statusCode = resStatus || 200,
        data = {};

    if (argumentsObj.length === 2) {
      // (body, status) backwards compatability mode, spoken of here:
      // [express#backwards-compat](https://github.com/visionmedia/express/blob/master/lib/response.js#L91)
      if ('number' != typeof argumentsObj[0] && 'number' == typeof argumentsObj[1]) {
        statusCode = argumentsObj[1];
        body = _getBody(argumentsObj[0]);
      } else {
        statusCode = argumentsObj[0];
        body = _getBody(argumentsObj[1]);
      }

      data.body = body;
      data.status = statusCode;
    } else {
      if (helpers.isNumber(argumentsObj[0])) {
        statusCode = argumentsObj[0];

        data.body = statusCode;
        data.status = statusCode;
      } else {
        body = _getBody(argumentsObj[0]);

        data.body = body;
        data.status = statusCode;
      }
    }

    return data;
  };

  var _captureRenderData = function (argumentsObj) {
    var body, data = {};
    if (argumentsObj.length >= 2 && helpers.isObject(argumentsObj[1])) {
      data.body = helpers.extend({}, argumentsObj[1]); // We need a new object, otherwise we get a reference which later has _locals added to it...
    } else {
      data.body = {};
    }

    return data;
  };

  this.getResponseData = _captureResponseData;
  this.getRenderData = _captureRenderData;

  this.proxyResponseObject = function (res) {
    
    var responseJsonSend  = res.json,
        responseJsonpSend = res.jsonp,
        responseSend      = res.send,
        responseRedirect  = res.redirect,
        responseRender    = res.render,
        responseSendfile  = res.sendfile,
        responseDownload  = res.download;

    var parsedResponseData = {};

    // A check that is used by res.send since parsing might already have been done by
    // res.json or res.jsonp which call res.send themselves.
    var hasNotBeenProxiedAlready = function (parsedResponseData) {
      return Object.keys(parsedResponseData).length === 0;
    };

    // A proxied version of an express method which can handle the following
    // arguments:
    // - (status, data)
    // - (status)
    // - (data)
    // - (body, status) compatability
    res.json = function (/* arguments */) {
      var responseData = _captureResponseData(arguments, res.statusCode || 200);
      parsedResponseData.body = responseHandler.parseResponseBody(responseData.body);
      parsedResponseData.status = responseData.status;

      responseJsonSend.apply(res, arguments);
    };

    // A proxied version of an express method which can handle the following
    // arguments:
    // - (status, data)
    // - (status)
    // - (data)
    // - (body, status) compatability
    res.jsonp = function (/* arguments */) {
      var responseData = _captureResponseData(arguments, res.statusCode || 200);
      parsedResponseData.body = responseHandler.parseResponseBody(responseData.body);
      parsedResponseData.status = responseData.status;

      responseJsonpSend.apply(res, arguments);
    };

    // A proxied version of an express method which can handle the following
    // arguments:
    // - (status, data)
    // - (status)
    // - (data)
    // - (body, status) compatability
    res.send = function (/* arguments */) {
      // If .json or .jsonp call this with a string, an implementation-level detail which 
      // is currently correct then we won't reparse the response again due to the next line.
      if (hasNotBeenProxiedAlready(parsedResponseData)) {
        var responseData = _captureResponseData(arguments, res.statusCode || 200);
        parsedResponseData.body = responseHandler.parseResponseBody(responseData.body);
        parsedResponseData.status = responseData.status;
      }

      responseSend.apply(res, arguments);
    };

    // (url)
    // (status, url)
    // (url, status)
    res.redirect = function (/* arguments */) {
      var responseData = _captureResponseData(arguments, res.statusCode || 200);
      parsedResponseData.body = {
        redirectTo: responseHandler.parseResponseBody(responseData.body)
      };
      parsedResponseData.status = responseData.status;

      responseRedirect.apply(res, arguments);
    };

    // (view)
    // (view, options, function)
    // (view, function)
    res.render = function (/* arguments */) {
      var responseData = _captureRenderData(arguments);
      parsedResponseData.body = responseData.body;
      parsedResponseData.status = res.statusCode;

      responseRender.apply(res, arguments);
    };

    // (path)
    // (path, options)
    // (path, options, function)
    // (path, function)
    res.sendfile = function (/* arguments */) {
      // I don't need to know about the options or the fn. They're beyond the point.
      parsedResponseData.body = {
        filePath: arguments[0]
      };
      parsedResponseData.status = res.statusCode; // @todo: if file does not exist, this lies...

      responseSendfile.apply(res, arguments);
    };

    // (path)
    // (path, filename)
    // (path, filename, function)
    // (path, function)
    res.download = function (/* arguments */) {
      parsedResponseData.body = {
        filePath: arguments[0]
      };
      if (arguments[1] && helpers.isString(arguments[1])) {
        parsedResponseData.body.fileName = arguments[1];
      }
      parsedResponseData.status = res.statusCode;

      responseDownload.apply(res, arguments);
    };

    return parsedResponseData;
  };

  return this;

}).bind({});

exports = module.exports = ProxyResponseModule;
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
  // - (body, status) compatability.
  var _getResponseData = function (argumentsObj) {
    var temp,
        body, statusCode = 200,
        data = {};

    if (argumentsObj.length === 2) {
      // (body, status) backwards compat
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

        data.body = null;
        data.status = statusCode;
      } else {
        body = _getBody(argumentsObj[0]);

        data.body = body;
        data.status = statusCode;
      }
    }

    return data;
  };

  this.getResponseData = _getResponseData;

  this.proxyResponseObject = function (res) {
    
    var responseJsonSend  = res.json,
        responseJsonpSend = res.jsonp,
        responseSend      = res.send,
        responseRedirect  = res.redirect,
        responseRender    = res.render,
        responseSendFile  = res.sendFile,
        responseDownload  = res.download;

    var parsedResponseData = {};

    var hasNotBeenProxiedAlready = function (parsedResponseData) {
      return Object.keys(parsedResponseData).length === 0;
    };
    
    res.json = function (/* arguments */) {
      var responseData = _getResponseData(arguments);
      parsedResponseData.body = responseHandler.parseResponseBody(responseData.body);
      parsedResponseData.status = responseData.status;

      responseJsonSend.apply(res, arguments);
    };

    res.jsonp = function (/* arguments */) {
      var responseData = _getResponseData(arguments);
      parsedResponseData.body = responseHandler.parseResponseBody(responseData.body);
      parsedResponseData.status = responseData.status;

      responseJsonpSend.apply(res, arguments);
    };

    res.send = function (/* arguments */) {
      // If .json or .jsonp call this with a string, an implementation-level detail which 
      // is currently correct then we won't reparse the response again due to the next line.
      if (hasNotBeenProxiedAlready(parsedResponseData)) {
        var responseData = _getResponseData(arguments);
        parsedResponseData.body = responseHandler.parseResponseBody(responseData.body);
        parsedResponseData.status = responseData.status;
      }

      responseSend.apply(res, arguments);
    };

    res.redirect = function (/* arguments */) {
      // (url)
      // (status, url)
      // (url, status)
      responseRedirect.apply(res, arguments);
    };

    res.render = function (/* arguments */) {
      // (view)
      // (view, options, function)
      // (view, function)
      responseRender.apply(res, arguments);
    };

    res.sendFile = function (/* arguments */) {
      // (path)
      // (path, options)
      // (path, options, function)
      // (path, function)
      responseSendFile.apply(res, arguments);
    };

    res.download = function (/* arguments */) {
      // (path)
      // (path, filename)
      // (path, filename, function)
      // (path, function)
      responseDownload.apply(res, arguments);
    };

    return parsedResponseData;
  };

  return this;

}).bind({});

exports = module.exports = ProxyResponseModule;
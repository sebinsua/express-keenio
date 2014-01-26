"use strict";

var helpers = require('../core/helpers');

var ResponseModule = require('./response');

var ProxyResponseModule = (function (options, eventEmitter) {
  this._ee = helpers.setDefaultEvents(eventEmitter, []);
    
  var responseHandler = new ResponseModule(options);
  
  var getResponseData = function (responseSendArguments) {
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

    var temp,
        body,
        statusCode = 200,
        data = {};

    if (responseSendArguments.length === 2) {
      statusCode = responseSendArguments[0];
      temp = responseSendArguments[1];

      body = _getBody(temp);

      data.body = body;
      data.status = statusCode;
    } else {
      temp = responseSendArguments[0];

      if (helpers.isNumber(temp)) {
        statusCode = temp;

        data.status = statusCode;
      } else {
        body = _getBody(temp);

        data.body = body;
        data.status = statusCode;
      }
    }

    return data;
  };

  this.getResponseData = getResponseData;

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
      // @todo: Simplify how getResponseData works so it can help these things, like.
      if (hasNotBeenProxiedAlready(parsedResponseData)) {
        var responseData = getResponseData(arguments);
        parsedResponseData.body = responseHandler.parseResponseBody(responseData.body);
        parsedResponseData.status = responseData.status;
      }

      responseJsonSend.apply(res, arguments);
    };

    res.jsonp = function (/* arguments */) {
      // @todo: Add support for the crazy callback thing.
      responseJsonpSend.apply(res, arguments);
    };

    res.send = function (/* arguments */) {
      if (hasNotBeenProxiedAlready(parsedResponseData)) {
        var responseData = getResponseData(arguments);
        parsedResponseData.body = responseHandler.parseResponseBody(responseData.body);
        parsedResponseData.status = responseData.status;
      }

      responseSend.apply(res, arguments);
    };

    res.redirect = function (/* arguments */) {
      responseRedirect.apply(res, arguments);
    };

    res.render = function (/* arguments */) {
      responseRender.apply(res, arguments);
    };

    res.sendFile = function (/* arguments */) {
      responseSendFile.apply(res, arguments);
    };

    res.download = function (/* arguments */) {
      responseDownload.apply(res, arguments);
    };

    return parsedResponseData;
  };

  return this;

}).bind({});

exports = module.exports = ProxyResponseModule;
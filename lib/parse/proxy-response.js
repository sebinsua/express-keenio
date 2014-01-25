"use strict";

var helpers = require('../core/helpers');

var ResponseModule = require('./response');

var ProxyResponseModule = (function (options) {
  
  var responseHandler = new ResponseModule(options);
  
  var getResponseData = function (responseSendArguments) {
    var _getBody = function (temp) {
      var body;
      if (helpers.isObject(temp)) {
        body = temp;
      } else if (helpers.isString(temp)) {
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
    var responseSend = res.send,
        parsedResponseData = {};
    
    res.send = function ( /* arguments */ ) {
      var responseData = getResponseData(arguments);

      parsedResponseData.body = responseHandler.parseResponseBody(responseData.body);
      parsedResponseData.status = responseData.status;

      responseSend.apply(res, arguments);
    };

    return parsedResponseData;
  };

  return this;

}).bind({});

exports = module.exports = ProxyResponseModule;
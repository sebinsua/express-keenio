"use strict";

var helpers = require('../core/helpers');

var ResponseModule = require('./response');

var ProxyResponseModule = (function (options) {
  
  var responseHandler = new ResponseModule(options);
  
  var getResponseData = function (responseSendArguments) {
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

  this.getResponseData = getResponseData;

  this.proxyResponseObject = function (res) {
    var responseSend = res.send,
        parsedResponseData = this;
    
    res.send = function ( /* arguments */ ) {
      var responseData = getResponseData(arguments);

      parsedResponseData.reaction = responseHandler.parseResponseBody(responseData.reaction);
      parsedResponseData.status = responseData.status;

      responseSend.apply(res, arguments);
    };
  };

  return this;

}).bind({});

exports = module.exports = ProxyResponseModule;
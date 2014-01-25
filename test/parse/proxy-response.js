"use strict";

var should = require('chai').should();

var ProxyResponseModule = require('../../lib/parse/proxy-response');

describe("_getResponseData()", function () {
  var getResponseData;
  beforeEach(function () {
    var proxyResponseHandler = ProxyResponseModule({});
    getResponseData = proxyResponseHandler.getResponseData;
  });

  it("should support a single numeric argument", function () {
    getResponseData([201]).should.eql({
      status: 201
    });
  });

  it("should support a single string argument", function () {
    getResponseData(['hello world']).should.eql({
      status: 200,
      body: 'hello world'
    });
  });

  it("should support a single json string argument", function () {
    getResponseData(['{ "special": "text" }']).should.eql({
      status: 200,
      body: {
        special: "text"
      }
    });
  });

  it("should support a single json object argument", function () {
    getResponseData([{
      "special": "text"
    }]).should.eql({
      status: 200,
      body: {
        special: "text"
      }
    });
  });

  it("should support two arguments", function () {
    getResponseData([404, {
      "error": "message"
    }]).should.eql({
      status: 404,
      body: {
        error: "message"
      }
    });
  });

});
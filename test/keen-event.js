"use strict";

var should = require('chai').should();

var KeenEventModule = require('../lib/keen-event');

describe("_isValidProperty()", function () {
  var keenEventHandler;
  beforeEach(function () {
    keenEventHandler = new KeenEventModule({});
  });

  it("should accept valid properties", function () {
    var tests = [
      "abc", // less than 256 characters long
      "^$%&", // a dollar sign cannot be the first character
      "separated-by-a-dash", // there cannot be periods in the name
      "cannot-be-a-null-value" // cannot be a null value
    ];
    tests.forEach(function (test) {
      keenEventHandler._isValidProperty(test).should.be.true;
    });
  });
  it("should not accept invalid properties", function () {
    var tests = [
      "abcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabc",
      "$^%&",
      "separated.by.a.period",
      "",
      undefined,
      null
    ];
    tests.forEach(function (test) {
      keenEventHandler._isValidProperty(test).should.be.false;
    });
  });
});

describe("_sanitizeData()", function () {
  var keenEventHandler;

  it("should wipe out the value inside a 'password' key, even inside hierarhcy", function () {
    var inputData = {
      user: {
        password: 'abc123'
      },
      otherProperty: 'def456'
    }, outputData = {
      user: {
        password: '[redacted]'
      },
      otherProperty: 'def456'
    };
    keenEventHandler = new KeenEventModule({});
    keenEventHandler._sanitizeData(inputData).should.eql(outputData);
  });

  it("should wipe out the value inside a user-defined bad property", function () {
    var inputData = {
      property: 'abc123',
      otherProperty: 'def456'
    }, outputData = {
      property: 'abc123',
      otherProperty: '[redacted]'
    };
    keenEventHandler = new KeenEventModule({
      badProperties: ['otherProperty']
    });
    keenEventHandler._sanitizeData(inputData).should.eql(outputData);
  });

  it("should wipe out all keys which are invalid Keen.IO properties", function () {
    var inputData = {
      '$^%&': 'abc123',
      'separated.by.a.period': 'def456',
      validProperty: 'ghi789',
      otherValidProperty: 'here-it-is'
    }, outputData = {
      validProperty: 'ghi789',
      otherValidProperty: 'here-it-is'
    };
    keenEventHandler = new KeenEventModule({});
    keenEventHandler._sanitizeData(inputData).should.eql(outputData);
  });
});
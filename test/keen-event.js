"use strict";

var should = require('chai').should();

var EventEmitter = require('events').EventEmitter;

var KeenEventModule = require('../lib/keen-event');

describe("_isValidProperty()", function () {
  var keenEventHandler;
  beforeEach(function () {
    keenEventHandler = new KeenEventModule({}, new EventEmitter());
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
    keenEventHandler = new KeenEventModule({}, new EventEmitter());
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
      blacklistProperties: ['otherProperty']
    }, new EventEmitter());
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
    keenEventHandler = new KeenEventModule({}, new EventEmitter());
    keenEventHandler._sanitizeData(inputData).should.eql(outputData);
  });
});

describe("_checkPropertyDepth()", function () {
  var keenEventHandler;
  beforeEach(function () {
    keenEventHandler = new KeenEventModule({}, new EventEmitter());
  });

  it("should give the correct depth of the deepest property of an empty object", function () {
    var obj = {};
    keenEventHandler._checkPropertyDepth(obj).should.equal(1);
  });

  it("should give the correct depth of the deepest property of an object with two levels", function () {
    var obj = { a: { b: 'at depth 2' }};
    keenEventHandler._checkPropertyDepth(obj).should.equal(2);
  });

  it("should give the correct depth of the deepest property of an object with five levels", function () {
    var obj = { a: { b: 'at depth 2', h: { i: 'at depth 3'} }, c: { d: { e: { f: { g: 'at depth 5' }}}}};
    keenEventHandler._checkPropertyDepth(obj).should.equal(5);
  });

  it("will not smite unless it is told to", function () {
    var rigorMortis = { a: { b: { c: { d: { e: { f: { g: { h: { i: { j: { k: { l: 'wow so deep' }}}}}}}}}}}};
    var notSmitten = { a: { b: { c: { d: { e: { f: { g: { h: { i: { j: { k: { l: 'wow so deep' }}}}}}}}}}}};
    keenEventHandler._checkPropertyDepth(notSmitten);
    notSmitten.should.eql(rigorMortis);
  });

  it("will do its master's bidding and smite if it is told to", function () {
    var rigorMortis = { a: { b: { c: { d: { e: { f: { g: { h: { i: { j: { k: { l: 'wow so deep' }}}}}}}}}}}};
    var smitten = { a: { b: { c: { d: { e: { f: { g: { h: { i: { j: { k: { l: 'wow so deep' }}}}}}}}}}}};
    keenEventHandler._checkPropertyDepth(smitten, true);
    smitten.should.not.eql(rigorMortis);
    // good boy! *pat pat*
  });
});

describe("_checkForArraysOfObjects()", function () {
  var keenEventHandler;
  beforeEach(function () {
    keenEventHandler = new KeenEventModule({}, new EventEmitter());
  });

  it("should return the same object when given no arrays-of-objects", function () {
    var obj = { a: 2, deeper: { b: 3, c: [1, 2, 3] } };
    keenEventHandler._checkForArraysOfObjects(obj).should.eql(obj);
  });

  it("should remove arrays-of-objects if they are found", function () {
    var obj = { a: 2, deeper: { b: 3, c: [{ id: 1 }, { id: 2 }, { id: 3 }] } };
    var smitten = { a: 2, deeper: { b: 3 } };
    keenEventHandler._checkForArraysOfObjects(obj).should.eql(smitten);
  });

  xit("should execute an aggregation method on arrays-of-objects when found", function () {

  });
});

describe("_checkForExtremelyLongStrings()", function () {
  var keenEventHandler;
  beforeEach(function () {
    keenEventHandler = new KeenEventModule({}, new EventEmitter());
  });

  it("should return the same object when given no extremely long strings", function () {
    var obj = { a: 2, aString: 'abc' };
    keenEventHandler._checkForExtremelyLongStrings(obj).should.eql(obj);
  });

  it("should remove extremely long strings from an object", function () {
    var obj = { a: 2, aString: Array(1000).join("abc") };
    var smitten = { a: 2 };
    keenEventHandler._checkForExtremelyLongStrings(obj).should.eql(smitten);
  });
});
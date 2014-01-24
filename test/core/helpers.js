"use strict";

var should = require('chai').should();

var helpers = require('../../lib/core/helpers');

describe("isArrayOfObjects()", function () {

  it("should return false if not passed an array of objects", function () {
    var tests = [
      [null, null, null],
      [],
      [1, 2],
      ['not a good idea', 'at all'],
      [1, 2, 3, { wtf: 'are you doing' }],
      null,
      'worddddddddddddd',
      56.23,
      9,
      false
    ];
    tests.forEach(function (test) {
      helpers.isArrayOfObjects(test).should.be.false;
    });
  });

  it("should return true if passed an array of objects", function () {
    var tests = [
      [{ id: 1, name: 'seb' }, { id: 2, name: 'gilly', country: 'london' }],
      [{}, {}, {}],
      [{ key: 'yale', lock: 'yale', interfaceComplete: true }, { key: 'yale', lock: 'cryptographic', interfaceComplete: false }]
    ];
    tests.forEach(function (test) {
      helpers.isArrayOfObjects(test).should.be.true;
    });
  });

});
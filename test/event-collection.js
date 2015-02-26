"use strict";

var chai = require('chai');
var should = chai.should();

var EventCollectionModule = require('../lib/event-collection');

describe("_isValidEventCollectionName()", function () {

  var eventCollectionHandler;
  beforeEach(function () {
    eventCollectionHandler = new EventCollectionModule({});
  });

  it("should accept valid event collection names", function () {
    var tests = [
      "abc", // less than 64 characters long
      "^%&", // only ascii characters
      "^%&nodollarinthis", // no dollar symbols
      "cannot_start_with_an_underscore_", // cannot start with an underscore
      "cannot.start.or.end.with.periods", // cannot start or end with periods
      "cannot-be-a-null-value" // cannot be a null value
    ];
    tests.forEach(function (test) {
      eventCollectionHandler._isValidEventCollectionName(test).should.be.true;
    });
  });

  it("should not accept invalid event collection names", function () {
    var tests = [
      "abcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabc",
      "ɻʮʭʨ",
      "^%$&",
      "_thisshouldnothavestartedwithunderscore",
      ".thisshouldnothavestartedwithaperiod",
      "thisshouldnothaveendedwithaperiod.",
      "",
      undefined,
      null
    ];
    tests.forEach(function (test) {
      eventCollectionHandler._isValidEventCollectionName(test).should.be.false;
    });
  });

});

describe("generateName()", function () {

  var eventCollectionHandler;
  beforeEach(function () {
    eventCollectionHandler = new EventCollectionModule({});
  });

  it("should not generate an invalid event collection name if passed a very complex route", function () {
    var route = {
      path: '/test-a-very-long/path-name/that-goes-on-forever',
      methods: {
        GET: true,
        POST: true,
        HEAD: true,
        OPTIONS: true
      }
    };

    var name = eventCollectionHandler.generateName(route);
    name.length.should.be.below(64);
  });
})

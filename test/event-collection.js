"use strict";

var should = require('chai').should();

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

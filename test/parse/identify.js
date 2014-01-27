"use strict";

var should = require('chai').should();

var IdentifyModule = require('../../lib/parse/identify');

describe("identify()", function () {

  it("should be able to get out data from req.user if this has been set", function () {
    var req = {
      get: function () {},
      user: {
        id: 'abc123'
      }
    };

    var identifyHandler = new IdentifyModule({});
    identifyHandler.identify(req).should.eql({
      user: {
        id: 'abc123'
      }
    });
  });

  it("should be able to fallback to getting data from a session variable if user was not set", function () {
    var req = {
      get: function () {},
      session: {
        id: 'abc123',
        name: 'Seb'
      }
    };

    var identifyHandler = new IdentifyModule({});
    identifyHandler.identify(req).should.eql({
      session: {
        id: 'abc123',
        name: 'Seb'
      }
    });
  });

  it("should be able to fallback to empty data even if header data was sent", function () {
    var req = {
      get: function (name) { return req.headers[name]; },
      headers: {
        'Session-Id': '<fake-session>',
        'User-Agent': 'libwww/4.1'
      }
    };

    var identifyHandler = new IdentifyModule({});
    identifyHandler.identify(req).should.eql({
      'userAgent': 'libwww/4.1'
    });
  });

  it("should be able to have the identifier overridden to store any kind of identity", function () {
    var req = {
      get: function () {},
      headers: {
        'Client-Api-Key': 'abc123',
        'User-Agent': 'libwww/4.1'
      }
    };

    var options = {
      handlers: {
        generateIdentity: function (req) {
          return req.headers['Client-Api-Key'];
        }
      }
    };

    var identifyHandler = new IdentifyModule(options);
    identifyHandler.identify(req).should.eql('abc123');
  });

});
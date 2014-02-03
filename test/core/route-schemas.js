"use strict";

var RouteSchemas = require('../../lib/core/route-schemas'),
    EventualSchema = require('eventual-schema');

var should = require('chai').should(),
    sinon = require('sinon');

describe('RouteSchemas', function () {

  describe('#construct', function () {

    it("should generate a RouteSchemas object with the correct defaults", function () {
      var routeSchemas = new RouteSchemas();
      routeSchemas.eventualSchemaOptions.should.eql({})
      routeSchemas.routes.should.eql({});
    });

    it("should generate a RouteSchemas object with options passed in", function () {
      var routeSchemas = new RouteSchemas({ a: 'word' });
      routeSchemas.eventualSchemaOptions.should.eql({ a: 'word' });
      routeSchemas.routes.should.eql({});
    });

  });

  describe("#add", function () {

    var routeSchemas;
    beforeEach(function () {
      routeSchemas = new RouteSchemas();
    });

    it("should be able to take a route which has not been used before and will then execute the method #_initRouteEventualSchemas", function () {
      var initRouteSchemasSpy = sinon.spy();
      routeSchemas._initRouteEventualSchemas = initRouteSchemasSpy;

      var event = {
        intention: {
          query: {
            abc: 123
          },
          body: {
            def: 456,
            ghi: 789,
            jkl: {
              mno: 131415
            }
          }
        },
        reaction: {
          pqr: 161718
        }
      };

      routeSchemas.add({ method: 'GET', path: '/users/:userId' }, event);

      routeSchemas._initRouteEventualSchemas.called.should.be.true;
    });

    it("should be able to take a route and an event and will correctly call all three eventual schema objects", function () {
      // I need a way of maintaining eventual schemas for each.
      var event = {
        intention: {
          query: {
            abc: 123
          },
          body: {
            def: 456,
            ghi: 789,
            jkl: {
              mno: 131415
            }
          }
        },
        reaction: {
          pqr: 161718
        }
      };

      var querySchemaSpy = {
        add: sinon.spy()
      }, bodySchemaSpy = {
        add: sinon.spy()
      }, reactionSchemaSpy = {
        add: sinon.spy()
      };

      routeSchemas.routes['GET /users/:userId'] = {};
      routeSchemas.routes['GET /users/:userId'].query = querySchemaSpy;
      routeSchemas.routes['GET /users/:userId'].body = bodySchemaSpy;
      routeSchemas.routes['GET /users/:userId'].reaction = reactionSchemaSpy;

      routeSchemas.add({ method: 'GET', path: '/users/:userId' }, event);
      
      querySchemaSpy.add.callCount.should.equal(1);
      querySchemaSpy.add.args[0][0].should.equal(event.intention.query);

      bodySchemaSpy.add.callCount.should.equal(1);
      bodySchemaSpy.add.args[0][0].should.equal(event.intention.body);

      reactionSchemaSpy.add.callCount.should.equal(1);
      reactionSchemaSpy.add.args[0][0].should.equal(event.reaction);
    });

  });

  describe("#getWhitelist", function () {
    
    var routeSchemas;
    beforeEach(function () {
      routeSchemas = new RouteSchemas();
    });

    it("should be able to take a route which has not been used before and will then execute initRouteEventualSchema()", function () {
      var initRouteSchemasSpy = sinon.spy();
      routeSchemas._initRouteEventualSchemas = initRouteSchemasSpy;

      routeSchemas.getWhitelist({ method: 'GET', path: '/users/:userId' });

      routeSchemas._initRouteEventualSchemas.called.should.be.true;
    });

    it('should return an empty object if it has not been frozen yet', function () {
      routeSchemas.getWhitelist({ method: 'GET', path: '/users/:userId' }).should.be.eql({});
    });

    it('should be able to give an empty whitelist for a route that was passed in', function () {
      var event = {
        intention: {
          query: {
            abc: 123
          },
          body: {
            def: 456,
            ghi: 789,
            jkl: {
              mno: 131415
            }
          }
        },
        reaction: {
          pqr: 161718
        }
      };

      var badFreezeStrategyRouteSchemas = new RouteSchemas({ freezeStrategy: [function () { return false; }] });
      badFreezeStrategyRouteSchemas.add({ method: 'GET', path: '/users/:userId' }, event);
      badFreezeStrategyRouteSchemas.getWhitelist({ method: 'GET', path: '/users/:userId' }).should.be.eql({});
    });

    it("should be able to generate and return a whitelist in the correct format", function () {
      // I need a way of converting an eventual schema into a whitelist representation like this:
      // [ 'a.num', 'a.arr', 'b.arr[].name', 'b.arr[].types', 'b.value.type', 'b.value.name', 'c.arr' ]
      var event = {
        intention: {
          query: {
            abc: 123,
            word: true
          },
          body: {
            def: 456,
            ghi: 789,
            jkl: {
              mno: 131415
            }
          }
        },
        reaction: {
          pqr: 161718
        }
      };
      var newEvent = {
        intention: {
          query: {
            abc: 123
          },
          body: {},
        },
        reaction: {

        }
      };

      var whitelist = {
        "query": [
          "abc",
          "word"
        ],
        "body": [
          "def",
          "ghi",
          "jkl.mno"
        ],
        "reaction": [
          "pqr"
        ]
      };

      var instantFreezeStrategyRouteSchemas = new RouteSchemas({ freezeStrategy: [function () { return this._instanceCount >= 2; }], getWhitelistStrategy: [function (ctx) { return true; }] });
      instantFreezeStrategyRouteSchemas.add({ method: 'GET', path: '/users/:userId' }, event);
      instantFreezeStrategyRouteSchemas.add({ method: 'GET', path: '/users/:userId' }, newEvent);
      instantFreezeStrategyRouteSchemas.getWhitelist({ method: 'GET', path: '/users/:userId' }).should.be.eql(whitelist);
    });

    xdescribe('freezeStrategy', function () {

    });

    xdescribe('getWhitelistStrategy', function () {

    });

  });

  describe('#_initRouteEventualSchemas', function () {

    var routeSchemas;
    beforeEach(function () {
      routeSchemas = new RouteSchemas();
    });

    it("will setup a route's eventual schemas correctly", function () {
      should.not.exist(routeSchemas.routes['GET /users/:userId']);
      routeSchemas._initRouteEventualSchemas({ method: 'GET', path: '/users/:userId' });

      // I need a way of adding a route and its related schemas.
      routeSchemas.routes['GET /users/:userId'].query.should.be.instanceof(EventualSchema);
      routeSchemas.routes['GET /users/:userId'].body.should.be.instanceof(EventualSchema);
      routeSchemas.routes['GET /users/:userId'].reaction.should.be.instanceof(EventualSchema);
    });

  });

  describe('#_flattenEventualSchema', function () {

    var routeSchemas;
    beforeEach(function () {
      routeSchemas = new RouteSchemas();
    });

    it('should flatten properties given a nested object', function () {
      var frozenEventualSchema = {
        a: {
          _propertyCount: 2,
          b: {
            _propertyCount: 1
          },          
          notB: {
            _propertyCount: 1,
            type: {
              _propertyCount: 1
            }
          },
          c: {
            _propertyCount: 2,
            d: {
              _propertyCount: 9
            }
          }
        }
      };
      var flattened = {
        'a.b': 1,
        'a.notB.type': 1,
        'a.c.d': 9
      };

      routeSchemas._flattenEventualSchema(frozenEventualSchema).should.be.eql(flattened);
    });

    it('should lose the _propertyCount and _arrayObjects key-value', function () {
      var frozenEventualSchema = {
        arr: {
          _arrayObjects: {
            name: { _propertyCount: 5 }
          },
          _propertyCount: 2
        }
      };
      var flattened = {
        'arr[].name': 5
      };

      routeSchemas._flattenEventualSchema(frozenEventualSchema).should.be.eql(flattened);
    });

    it('should flatten properties including arrays with a special notation given a nested object', function () {
      var frozenEventualSchema = {
        arr: {
          _arrayObjects: {
            name: { _propertyCount: 5 }
          },
          _propertyCount: 2
        },
        deep: {
          property: {
            goes: {
              here: { _propertyCount: 2 },
              _propertyCount: 2
            },
            _propertyCount: 2
          },
          arraysAreWeird: {
            _arrayObjects: {
              name: { _propertyCount: 2 }
            }
          },
          _propertyCount: 2
        }
      };
      var flattened = {
        'arr[].name': 5,
        'deep.property.goes.here': 2,
        'deep.arraysAreWeird[].name': 2
      };

      routeSchemas._flattenEventualSchema(frozenEventualSchema).should.be.eql(flattened);
    });

  });

  xdescribe("#save", function () {
    // I need a way of saving this information (collated instances *OR* eventual schema *OR* whitelist) to disk.
  });

  xdescribe("#load", function () {
    // I need a way of loading this information (collated instances *OR* eventual schema *OR* whitelist) into a series of routes eventual schema objects.
  });
  
});

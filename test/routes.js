"use strict";

var should = require('chai').should();

var RoutesModule = require('../lib/routes');

describe("isExcludedRoute()", function () {
  var configuration = {
    client: {
      projectId: '<test>',
      writeKey: '<test>'
    },
    excludeRoutes: [{
      route: "/other-route",
      method: "post"
    }, {
      route: "/test",
      method: "get"
    }, {
      route: "/test",
      method: "post"
    }],
  };
  var routesHandler;
  beforeEach(function () {
    routesHandler = new RoutesModule(configuration);
  });

  it("should return true if a route is in the excluded list", function () {
    var route = {
      path: "/test",
      method: "get"
    };

    routesHandler.isExcludedRoute(route).should.be.true;
  });

  it("should return false if a route is not in the excluded list", function () {
    var route = {
      path: "/test",
      method: "options"
    };

    routesHandler.isExcludedRoute(route).should.be.false;
  });
});

describe("getRouteConfig()", function () {
  var configuration = {
    client: {
      projectId: '<test>',
      writeKey: '<test>'
    },
    routes: [{
      route: "/other-route",
      method: "post"
    }, {
      route: "/test",
      method: "get",
      eventCollectionName: "specialEventCollectionName"
    }, {
      route: "/test",
      method: "post",
      tag: "specialTag"
    }],
  };
  var routesHandler;
  beforeEach(function () {
    routesHandler = new RoutesModule(configuration);
  });

  it("should just return undefined if there was nothing relevant in the configuration", function () {
    var route = {
      path: "/test",
      method: "options"
    };

    var metadata = routesHandler.getRouteConfig(route);
    metadata.should.be.false;
  });

  it("should return valid data if the route matched with one that had metadata", function () {
    var metadata, route_a = {
        path: "/test",
        method: "get"
      }, route_b = {
        path: "/other-route",
        method: "post"
      };

    metadata = routesHandler.getRouteConfig(route_a);
    metadata.should.eql({
      eventCollectionName: "specialEventCollectionName"
    });

    metadata = routesHandler.getRouteConfig(route_b);
    metadata.should.eql({});
  });
});
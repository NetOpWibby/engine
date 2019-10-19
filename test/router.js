"use strict"; /* global before, describe, it */



const Router = require("../src/router");
const assert = require("assert");
const sinon = require("sinon");

describe("Router", () => {
  let router = null;

  before(() => {
    //
  });

  it("Should break spec properly", () => {
    router = new Router();

    router.route("/home", ["GET"], () => 2);
    assert.strictEqual(router._routes.length, 1);
    assert.deepStrictEqual(router._routes[0].methods, ["GET"]);
    assert.deepStrictEqual(router._routes[0].params, []);
    assert.strictEqual(typeof (router._routes[0].handlers[0]), "function");
  });

  it("Should break spec properly with correct params", () => {
    router = new Router();

    router.route("/:class/students/:id/:session?", ["GET", "POST"], [() => true, () => false]);
    assert.strictEqual(router._routes.length, 1);
    assert.deepStrictEqual(router._routes[0].methods, ["GET", "POST"]);
    assert.deepStrictEqual(router._routes[0].params, ["class", "id", "session"]);
    assert.strictEqual(router._routes[0].handlers.length, 2);
  });

  it("Should handle route methods", () => {
    router = new Router();

    router.all("/all", () => true);
    router.get("/get", () => true);
    router.post("/post", () => true);
    router.put("/put", () => true);
    router.delete("/delete", () => true);

    assert.strictEqual(router._routes.length, 5);
    assert.deepStrictEqual(router._routes[0].methods, ["GET", "POST", "PUT", "DELETE"]);
    assert.deepStrictEqual(router._routes[1].methods, ["GET"]);
    assert.deepStrictEqual(router._routes[2].methods, ["POST"]);
    assert.deepStrictEqual(router._routes[3].methods, ["PUT"]);
    assert.deepStrictEqual(router._routes[4].methods, ["DELETE"]);
  });

  it("Should dispatch request correctly", () => {
    router = new Router();
    const cb1 = sinon.spy();

    router.route("/home/spy", ["GET"], cb1);
    router._dispatch({ url: "/home/spy", method: "GET" });
    assert.ok(cb1.called);
    cb1.resetHistory();

    const cb2 = (req, res, nex) => { // name
      req.crs = "crs";
      nex();
    };

    const cb3 = (req, res, nex, name) => {
      if (name)
        assert.strictEqual(name, "alex");

      assert.strictEqual(req.crs, "crs");
      nex();
    };

    router.route("/home/people/:name?", ["GET"], [cb2, cb3, cb1]);

    router._dispatch({ url: "/home/people/alex", method: "GET" }, null);
    assert.ok(cb1.called);
    assert.ok(cb1.calledWith({ url: "/home/people/alex", method: "GET", params: { name: "alex" }, crs: "crs" }, null, undefined, "alex"));
    cb1.resetHistory();

    router._dispatch({ url: "/home/people/alex", method: "GET" }, null);
    assert.ok(cb1.called);
    assert.ok(cb1.calledWith({ url: "/home/people/alex", method: "GET", params: { name: "alex" }, crs: "crs" }, null, undefined, "alex"));
    cb1.resetHistory();

    router._dispatch({ url: "/home/people", method: "GET" }, null);
    assert.ok(cb1.called);
    assert.ok(cb1.calledWith({ url: "/home/people", method: "GET", params: { name: undefined }, crs: "crs" }, null, undefined, undefined));
    cb1.resetHistory();
  });

  it("Should group routes correctly", () => {
    router = new Router();
    router.all("/all", () => 2);

    router.group("/get", r => {
      r.get("/students", () => true);
      r.get("/friends", () => true);
    });

    router.group("/alex", r => {
      r.all("/skills", () => true);
      r.get("/info", () => true);
    });

    assert.strictEqual(router._routes.length, 5);
    assert.deepStrictEqual(router._routes[1].regex, /^\/get\/students$/);
    assert.deepStrictEqual(router._routes[2].regex, /^\/get\/friends$/);
    assert.deepStrictEqual(router._routes[3].regex, /^\/alex\/skills$/);
    assert.deepStrictEqual(router._routes[4].regex, /^\/alex\/info$/);
  });
});

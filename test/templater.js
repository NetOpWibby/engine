"use strict"; /* global before, describe, it */



const Templater = require("../src/templater");
const assert = require("assert");
const path = require("path");
const fs = require("fs");
// const sinon = require("sinon");

describe("Templater", () => {
  let templater = null;
  let basePath = "";

  before(() => {
    basePath = path.resolve("./test/templates");

    try {
      fs.unlinkSync(path.join(basePath, ".tmp", "manifest.json"));
      fs.unlinkSync(path.join(basePath, ".tmp"));
    } catch(_) {
      //
    }
  });

  it("Should create a templater", () => {
    templater = new Templater("./test/templates");
    assert.strictEqual(templater._dir, basePath);
    assert.strictEqual(templater._compiledDir, path.join(basePath, ".tmp"));
    assert.throws(() => new Templater("./not_found_templates"), Error);
  });

  it("Should call render template correctly", () => {
    templater = new Templater("./test/templates");

    assert.deepStrictEqual(templater._tokenize(""), []);

    assert.deepStrictEqual(
      templater._tokenize("{% extends layout.hmtl %} {{ name }}"),
      ["{% extends layout.hmtl %}", "{{ name }}"]
    );

    let tokens = templater._tokenize(templater._readTmplSource("main.html"));

    assert.strictEqual(Array.isArray(tokens), true);
    assert.strictEqual(tokens.length, 7);

    const tmplSource = templater._readTmplSource("index.html");

    tokens = templater._tokenize(tmplSource);
    assert.strictEqual(tmplSource, fs.readFileSync("./test/templates/index.html"));
    assert.strictEqual(tokens.length, 17);

    const ast = templater.parse(tokens);

    assert.strictEqual(ast.constructor.name, "TemplateNode");
    assert.strictEqual(ast.nodes.length, 1);
    assert.strictEqual(ast.parent !== null, true);

    const genCode = templater.generate(ast);

    assert.strictEqual(genCode.includes("__njsOutput +=  title"), true);
    assert.strictEqual(genCode.includes("if (test) {"), true);
    assert.strictEqual(genCode.includes("} else {  __njsOutput += `"), true);
    assert.strictEqual(genCode.includes("for (let it of items) { "), true);
    assert.strictEqual(genCode.includes("__njsOutput +=  'idx+1'"), true);

    const response = templater.render("index.html", { title: "Home", test: true, items: ["Evan", "John", "Jane"] });

    assert.strictEqual(response.includes("<title>Home</title>"), true);
    assert.strictEqual(response.includes("truthy eval"), true);
    assert.strictEqual(response.includes("<li>#idx+1 : Evan</li>"), true);
    assert.strictEqual(response.includes("Jane"), true);
  });
});

"use strict";



const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class Templater {
  constructor(dir, cached) {
    this._dir = path.resolve(dir);
    this._cached = cached || false;
    this._compiledDir = path.join(this._dir, "compiled");
    this._tmpDir = path.join(this._dir, ".tmp");

    // create compiled directory if not exist
    if (!fs.existsSync(this._dir))
      throw Error("Template directory does not exist");

    if (!fs.existsSync(this._compiledDir))
      fs.mkdirSync(this._compiledDir);
  }

  render(file, context) {
    const sourceFile = path.join(this._dir, file);
    const compiledFile = this._compiledFile(file);
    let render = null;

    if (!fs.existsSync(sourceFile))
      throw Error("Template not found");

    // checks if compiled file exist
    if (this._cached && fs.existsSync(compiledFile)) {
      render = require(compiledFile);
      return render(context);
    }

    const ast = this.compile(file);

    this._saveGenCode(file, this.generate(ast));
    render = require(compiledFile);

    return render(context);
  }

  compile(file) {
    const ast = this.parse(this._tokenize(this._readTmplSource(file)));

    return ast;
  }

  parse(tokens) {
    this._parser = {
      pos: 0,
      templater: this,
      tokens: tokens
    };

    const rootAst = new TemplateNode(this._parser, tokens[0]);

    this._parse(rootAst);
    return rootAst;
  }

  generate(ast) {
    return `module.exports = function (context) {
            // extract context as local variables
            context = context || {}
            for(let varname of Object.keys(context)){
                this[varname]= context[varname]
            }
            let __njsOutput = ''
            ${ast.generate()}
            return __njsOutput
        }`;
  }

  _compiledFile(file) {
    const fileName = crypto.createHash("sha1").update(file)
      .digest("hex");

    return path.join(this._compiledDir, fileName + ".js");
  }

  _readTmplSource(file) {
    return fs.readFileSync(path.join(this._dir, file), "utf8");
  }

  _saveGenCode(file, content) {
    if (!fs.existsSync(this._tmpDir))
      fs.mkdirSync(this._tmpDir);

    fs.writeFileSync(this._compiledFile(file), content, "utf8");
  }

  _saveManifest(entry) {
    if (!entry)
      return;

    this._manifest = Object.assign(this._manifest, entry);
    fs.writeFileSync(this._manifestFile, JSON.stringify(this._manifest), "utf8");
  }

  _tokenize(templateTxt) {
    const tokenRegex = /({{.*?}}|{%.*?%})/;

    return templateTxt.split(tokenRegex).filter(match => {
      return match.trim() !== "";
    });
  }

  _parse(ast, stops) {
    while(this._parser.pos < this._parser.tokens.length) {
      const token = this._parser.tokens[this._parser.pos];
      const expr = token.replace(/[%{}]/g, "").trim()
        .split(/\s(.+)/);

      if (stops && Array.isArray(expr) && stops.includes(expr[0])) {
        this._parser.pos += 1;
        return expr[0]; // stop parsing nested block
      }

      // output
      if (token.startsWith("{{")) {
        const outNode = new OutNode(this._parser, [token]);

        outNode.parse(ast);
        continue;
      }

      const keyword = expr[0];

      // extend
      if (keyword === "extends") {
        const templateNode = new TemplateNode(this._parser, expr);

        templateNode.parse(ast);
        continue;
      }

      // block
      if (keyword === "block") {
        const blockNode = new BlockNode(this._parser, expr);

        blockNode.parse(ast);
        continue;
      }

      // if
      if (keyword === "if") {
        const ifNode = new IfNode(this._parser, expr);

        ifNode.parse(ast);
        continue;
      }

      // for
      if (keyword === "for") {
        const forNode = new ForNode(this._parser, expr);

        forNode.parse(ast);
        continue;
      }

      // text
      const textNode = new TextNode(this._parser, [token]);

      textNode.parse(ast);
    }
  }
}

class Node {
  constructor(parser, exprs) {
    this._parser = parser;
    this._exprs = exprs;
    this.nodes = [];
  }

  parse(ast) {} // eslint-disable-line no-unused-vars

  generate() {}
}


class TemplateNode extends Node {
  constructor(parser, exprs) {
    super(parser, exprs);
    this.parent = null;
  }

  parse(ast) {
    const file = this._exprs[1];
    this._parser.pos += 1; // eslint-disable-line padding-line-between-statements

    const tmp = new Templater(this._parser.templater._dir);
    ast.parent = tmp.compile(file); // eslint-disable-line padding-line-between-statements
  }

  generate() {
    let output = "";

    if (this.parent) {
      // collect blocks
      const blocks = {};

      for (const blk of this.nodes) {
        if (blk.constructor.name === "BlockNode")
          blocks[blk.name] = blk;
      }

      for (const node of this.parent.nodes) {
        // if it is an overriden block
        if (node.constructor.name === "BlockNode" && blocks[node.name]) {
          output += blocks[node.name].generate();
          continue;
        }

        output += node.generate();
      }

      return output;
    }

    for (const node of this.nodes)
      output += node.generate();

    return output;
  }
}

class BlockNode extends Node {
  constructor(parser, exprs) {
    super(parser, exprs);
    this.name = null;
  }

  parse(ast) {
    this.name = this._exprs[1];
    this._parser.pos += 1;
    this._parser.templater._parse(this, ["endblock"]);
    ast.nodes.push(this);
  }

  generate() {
    let output = "";

    for (const node of this.nodes)
      output += ` ${node.generate()} \n`;

    return output;
  }
}

class OutNode extends Node {
  parse(ast) {
    this.expr = this._exprs[0].replace(/[{}]/g, "");
    this._parser.pos += 1;
    ast.nodes.push(this);
  }

  generate() {
    return `__njsOutput += ${this.expr}\n`;
  }
}

class TextNode extends Node {
  parse(ast) {
    this.text = this._exprs[0];
    this._parser.pos += 1;
    ast.nodes.push(this);
  }

  generate() {
    return `__njsOutput += \`${this.text}\`\n`;
  }
}

class IfNode extends Node {
  constructor(parser, exprs) {
    super(parser, exprs);

    this.expr = null;
    this.ifNode = new BlockNode(parser, exprs);
    this.elseNode = new BlockNode(parser, this.exprs);
  }

  parse(ast) {
    this.expr = this._exprs[1];
    this._parser.pos += 1;

    const stop = this._parser.templater._parse(this.ifNode, ["else", "endif"]);

    if (stop === "else")
      this._parser.templater._parse(this.elseNode, ["endif"]);
    else
      this.elseNode = null;

    ast.nodes.push(this);
  }

  generate() {
    let output = "";

    output += `if ${this.expr} {\n`;

    for (const node of this.ifNode.nodes)
      output += ` ${node.generate()}\n`;

    if (this.elseNode) {
      output += "} else {";

      for (const node of this.elseNode.nodes)
        output += `${node.generate()}\n`;
    }

    output += "}\n";
    return output;
  }
}

class ForNode extends Node {
  constructor(parser, exprs) {
    super(parser, exprs);
    this.expr = null;
  }

  parse(ast) {
    this.expr = this._exprs[1];
    this._parser.pos += 1;
    this._parser.templater._parse(this, ["endfor"]);

    ast.nodes.push(this);
  }

  generate() {
    let output = "";

    output += `for ${this.expr} {\n`;

    for (const node of this.nodes)
      output += `${node.generate()}\n`;

    output += " }\n";

    return output;
  }
}

module.exports = exports = Templater;

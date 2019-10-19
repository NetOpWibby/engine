"use strict";



// this is a scratch may not reflect
const micro = require("njs-micro");

micro.config({
  env: "prod",
  mixedMidelware: true,
  templates: "./templates"
});

micro.route("/home", (req, res) => {
  res.render("index.html", {});
  res.end(200, "Hello world");
});

const authMidleware = (req, res, next) => {
  next(); // will fetch the internal req,res and call the handler with next
};

const jsonTransformMideware = (req, res, next) => { // eslint-disable-line no-unused-vars
  // do something with req/res/next
};

micro.get("/students/:id", [authMidleware, (req, res) => { // eslint-disable-line no-unused-vars
  // do something with req/res
}, jsonTransformMideware]);

micro.run(err => {
  if (!err)
    console.log("Success");
});

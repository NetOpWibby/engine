"use strict";



const Micro = require("./micro");

const app = new Micro({
  env: "prod",
  port: 3535,
  templates: "./templates"
});

app.router.all("/", (req, res) => {
  res.end("Micro ...");
});

app.route(router => {
  router.get("/template", (req, res) => {
    const data = {
      title: "Home",
      test: true,
      items: [
        "Evan",
        "John",
        "Jane"
      ]
    };

    res.render("index.html", data);
  });

  router.all("/hello/:name?", (req, res) => {
    const { name } = req.params || "world";

    res.end(`Hello ${name}!`);
  });
});

app.boot(err => {
  if (!err)
    console.log("OK");
});

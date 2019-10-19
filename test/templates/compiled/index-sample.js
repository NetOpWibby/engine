"use strict";



module.exports = exports = function(context) {
  // extract context as local variables
  for (const varname of Object.keys(context))
    this[varname] = context[varname];

  let __njsOutput = "";

  // __njsOutput += title;
  __njsOutput += "<p>more content ... </p>";

  return __njsOutput;
};

const { zipObject } = require("../distribution");
const lodash = require("lodash/zipObject");

exports["utils"] = () => zipObject(["a", "b"], [1, 2]);

exports["lodash"] = () => lodash(["a", "b"], [1, 2]);

const { fill } = require("../dist");
const lodash = require("lodash/fill");

exports["utils"] = () => fill([1, 2, 3], "a");

exports["lodash"] = () => lodash([1, 2, 3], "a");

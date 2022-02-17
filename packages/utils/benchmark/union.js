const { union } = require("../dist");
const lodash = require("lodash/union");

exports["utils"] = () => union([2], [1, 2]);

exports["lodash"] = () => lodash([2], [1, 2]);

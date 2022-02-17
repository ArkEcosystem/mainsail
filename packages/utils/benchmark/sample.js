const { sample } = require("../dist");
const lodash = require("lodash/sample");

exports["utils"] = () => sample([1, 2, 3, 4]);

exports["lodash"] = () => lodash([1, 2, 3, 4]);

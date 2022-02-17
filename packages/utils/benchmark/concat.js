const { concat } = require("../distribution");
const lodash = require("lodash/concat");

exports["utils"] = () => concat([1], [2]);

exports["lodash"] = () => lodash([1], [2]);

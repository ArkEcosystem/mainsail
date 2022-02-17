const { flatten } = require("../distribution");
const lodash = require("lodash/flatten");

exports["utils"] = () => flatten([1, [2, [3, [4]], 5]]);

exports["lodash"] = () => lodash([1, [2, [3, [4]], 5]]);

const { tail } = require("../distribution");
const lodash = require("lodash/tail");

exports["utils"] = () => tail([1, 2, 3]);

exports["lodash"] = () => lodash([1, 2, 3]);

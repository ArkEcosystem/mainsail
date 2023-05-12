const { last } = require("../distribution");
const lodash = require("lodash/last");

exports["utils"] = () => last([1, 2, 3]);

exports["lodash"] = () => lodash([1, 2, 3]);

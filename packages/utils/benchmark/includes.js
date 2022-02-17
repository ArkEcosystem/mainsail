const { includes } = require("../dist");
const lodash = require("lodash/includes");

exports["utils"] = () => includes([1, 2, 3], 1);

exports["lodash"] = () => lodash([1, 2, 3], 1);

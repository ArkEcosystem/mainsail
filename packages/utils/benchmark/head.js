const { head } = require("../distribution");
const lodash = require("lodash/head");

exports["utils"] = () => head([1, 2, 3]);

exports["lodash"] = () => lodash([1, 2, 3]);

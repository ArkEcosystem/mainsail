const { uniq } = require("../distribution");
const lodash = require("lodash/uniq");

exports["utils"] = () => uniq([2, 1, 2]);

exports["lodash"] = () => lodash([2, 1, 2]);

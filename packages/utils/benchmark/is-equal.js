const { isEqual } = require("../distribution");
const lodash = require("lodash/isEqual");

exports["utils"] = () => isEqual("abc", "abc");

exports["lodash"] = () => lodash("abc", "abc");

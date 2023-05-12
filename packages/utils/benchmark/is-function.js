const { isFunction } = require("../distribution");
const lodash = require("lodash/isFunction");

exports["utils"] = () => isFunction("abc");

exports["lodash"] = () => lodash("abc");

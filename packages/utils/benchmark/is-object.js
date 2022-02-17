const { isObject } = require("../dist");
const lodash = require("lodash/isObject");

exports["utils"] = () => isObject("abc");

exports["lodash"] = () => lodash("abc");

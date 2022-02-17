const { isArray } = require("../dist");
const lodash = require("lodash/isArray");

exports["utils"] = () => isArray("abc");

exports["lodash"] = () => lodash("abc");

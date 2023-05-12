const { isArray } = require("../distribution");
const lodash = require("lodash/isArray");

exports["utils"] = () => isArray("abc");

exports["lodash"] = () => lodash("abc");

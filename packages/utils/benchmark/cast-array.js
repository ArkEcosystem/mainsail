const { castArray } = require("../distribution");
const lodash = require("lodash/castArray");

exports["utils"] = () => castArray("abc");

exports["lodash"] = () => lodash("abc");

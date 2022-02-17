const { isSymbol } = require("../dist");
const lodash = require("lodash/isSymbol");

exports["utils"] = () => isSymbol("abc");

exports["lodash"] = () => lodash("abc");

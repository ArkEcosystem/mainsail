const { toUpper } = require("../distribution");
const lodash = require("lodash/toUpper");

exports["native"] = () => "__FOO_BAR__".toUpperCase();

exports["utils"] = () => toUpper("__FOO_BAR__");

exports["lodash"] = () => lodash("__FOO_BAR__");

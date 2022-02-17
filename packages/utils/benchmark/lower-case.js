const { lowerCase } = require("../distribution");
const lodash = require("lodash/lowerCase");

exports["utils"] = () => lowerCase("__FOO_BAR__");

exports["lodash"] = () => lodash("__FOO_BAR__");

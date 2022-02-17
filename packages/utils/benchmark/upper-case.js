const { upperCase } = require("../distribution");
const lodash = require("lodash/upperCase");

exports["utils"] = () => upperCase("__FOO_BAR__");

exports["lodash"] = () => lodash("__FOO_BAR__");

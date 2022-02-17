const { lowerFirst } = require("../distribution");
const lodash = require("lodash/lowerFirst");

exports["utils"] = () => lowerFirst("__FOO_BAR__");

exports["lodash"] = () => lodash("__FOO_BAR__");

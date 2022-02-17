const { upperFirst } = require("../distribution");
const lodash = require("lodash/upperFirst");

exports["utils"] = () => upperFirst("__FOO_BAR__");

exports["lodash"] = () => lodash("__FOO_BAR__");

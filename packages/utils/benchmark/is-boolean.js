const { isBoolean } = require("../distribution");
const lodash = require("lodash/isBoolean");

exports["utils"] = () => isBoolean("abc");

exports["lodash"] = () => lodash("abc");

const { camelCase } = require("../distribution");
const lodash = require("lodash/camelCase");

exports["utils"] = () => camelCase("Foo Bar");

exports["lodash"] = () => lodash("Foo Bar");

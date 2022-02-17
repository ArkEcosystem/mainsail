const { snakeCase } = require("../distribution");
const lodash = require("lodash/snakeCase");

exports["utils"] = () => snakeCase("Foo Bar");

exports["lodash"] = () => lodash("Foo Bar");

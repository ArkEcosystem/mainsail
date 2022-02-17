const { snakeCase } = require("../dist");
const lodash = require("lodash/snakeCase");

exports["utils"] = () => snakeCase("Foo Bar");

exports["lodash"] = () => lodash("Foo Bar");

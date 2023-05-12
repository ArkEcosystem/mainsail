const { isNumber, omitBy } = require("../distribution");
const lodash = require("lodash/omitBy");

exports["utils"] = () => omitBy({ a: 1, b: "2", c: 3 }, isNumber);

exports["lodash"] = () => lodash({ a: 1, b: "2", c: 3 }, isNumber);

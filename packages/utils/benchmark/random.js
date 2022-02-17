const { randomNumber } = require("../dist");
const lodash = require("lodash/random");

exports["utils"] = () => randomNumber(1, 10);

exports["lodash"] = () => lodash(1, 10);

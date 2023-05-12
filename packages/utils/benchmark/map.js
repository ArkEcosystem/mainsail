const { map } = require("../distribution");
const lodash = require("lodash/map");

exports["native"] = () => [4, 8].map((n) => n * n);

exports["utils"] = () => map([4, 8], (n) => n * n);

exports["lodash"] = () => lodash([4, 8], (n) => n * n);

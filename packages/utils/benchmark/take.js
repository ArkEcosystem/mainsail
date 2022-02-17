const { take } = require("../dist");
const lodash = require("lodash/take");

exports["utils"] = () => take([1, 2, 3], 2);

exports["lodash"] = () => lodash([1, 2, 3], 2);

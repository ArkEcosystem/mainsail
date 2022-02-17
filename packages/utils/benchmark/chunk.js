const { chunk } = require("../dist");
const lodash = require("lodash/chunk");

exports["utils"] = () => chunk(["a", "b", "c", "d"], 2);

exports["lodash"] = () => lodash(["a", "b", "c", "d"], 2);

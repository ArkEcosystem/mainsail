const { pull } = require("../dist");
const lodash = require("lodash/pull");

exports["utils"] = () => pull(["a", "b", "c", "a", "b", "c"], "a", "c");

exports["lodash"] = () => lodash(["a", "b", "c", "a", "b", "c"], "a", "c");

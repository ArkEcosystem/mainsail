const { pullAll } = require("../distribution");
const lodash = require("lodash/pullAll");

exports["utils"] = () => pullAll(["a", "b", "c", "a", "b", "c"], "a", "c");

exports["lodash"] = () => lodash(["a", "b", "c", "a", "b", "c"], "a", "c");

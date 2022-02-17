const { words } = require("../distribution");
const lodash = require("lodash/words");

exports["utils"] = () => words("fred, barney, & pebbles");

exports["lodash"] = () => lodash("fred, barney, & pebbles");

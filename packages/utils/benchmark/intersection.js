const { intersection } = require("../distribution");
const lodash = require("lodash/intersection");

exports["utils"] = () => intersection([2, 1], [2, 3]);

exports["lodash"] = () => lodash([2, 1], [2, 3]);

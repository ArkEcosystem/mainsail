const { has } = require("../distribution");
const lodash = require("lodash/has");

var object = {
	a: {
		b: 2,
	},
};

exports["utils"] = () => has(object, "a.b");

exports["lodash"] = () => lodash(object, "a.b");

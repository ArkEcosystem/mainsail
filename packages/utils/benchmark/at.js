const { at } = require("../dist");
const lodash = require("lodash/at");

var object = {
	a: {
		b: {
			c: 3,
		},
	},
	x: {
		y: {
			z: 4,
		},
	},
};

exports["utils"] = () => at(object, ["a.b.c", "x.y.z"]);

exports["lodash"] = () => lodash(object, ["a.b.c", "x.y.z"]);

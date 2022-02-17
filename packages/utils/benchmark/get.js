const { get } = require("../dist");
const lodash = require("lodash/get");

var object = {
	a: {
		b: {
			c: 3,
		},
	},
};

exports["utils"] = () => get(object, "a.b.c");

exports["lodash"] = () => lodash(object, "a.b.c");

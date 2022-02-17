const { merge } = require("../dist");
const lodash = require("lodash/merge");

var object = {
	a: [
		{
			b: 2,
		},
		{
			d: 4,
		},
	],
};

var other = {
	a: [
		{
			c: 3,
		},
		{
			e: 5,
		},
	],
};

exports["utils"] = () => merge(object, other);

exports["lodash"] = () => lodash(object, other);

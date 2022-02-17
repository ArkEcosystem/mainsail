const { pick } = require("../dist");
const lodash = require("lodash/pick");

exports["utils"] = () =>
	pick(
		{
			a: 1,
			b: "2",
			c: 3,
		},
		["a", "c"],
	);

exports["lodash"] = () =>
	lodash(
		{
			a: 1,
			b: "2",
			c: 3,
		},
		["a", "c"],
	);

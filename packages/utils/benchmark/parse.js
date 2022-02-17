const { parse } = require("../distribution");

const json = JSON.stringify(
	new Array(1000).fill({
		a: 1,
		b: 2,
		c: 3,
	}),
);

exports["native"] = () => JSON.parse(json);

exports["utils"] = () => parse(json);

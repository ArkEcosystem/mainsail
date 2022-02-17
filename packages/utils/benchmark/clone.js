const { clone } = require("../distribution");
const lodash = require("lodash/clone");

const objects = [
	{
		a: 1,
	},
	{
		b: 2,
	},
];

exports["utils"] = () => clone(objects);

exports["lodash"] = () => lodash(objects);

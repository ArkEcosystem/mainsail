const { minBy } = require("../distribution");
const lodash = require("lodash/minBy");

const objects = [
	{
		n: 1,
	},
	{
		n: 2,
	},
];

exports["utils"] = () => minBy(objects, (o) => o.n);

exports["lodash"] = () => lodash(objects, (o) => o.n);

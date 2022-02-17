const { cloneDeep } = require("../dist");
const lodash = require("lodash/cloneDeep");

const objects = [
	{
		a: 1,
	},
	{
		b: 2,
	},
];

exports["utils"] = () => cloneDeep(objects);

exports["lodash"] = () => lodash(objects);

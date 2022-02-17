const { partition } = require("../dist");
const lodash = require("lodash/partition");

const users = [
	{
		user: "barney",
		age: 36,
		active: false,
	},
	{
		user: "fred",
		age: 40,
		active: true,
	},
	{
		user: "pebbles",
		age: 1,
		active: false,
	},
];

exports["utils"] = () => partition(users, (o) => o.active);

exports["lodash"] = () => lodash(users, (o) => o.active);

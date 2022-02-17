const { filter } = require("../dist");
const lodash = require("lodash/filter");

const users = [
	{
		user: "barney",
		age: 36,
		active: true,
	},
	{
		user: "fred",
		age: 40,
		active: false,
	},
];

exports["native"] = () => users.filter((o) => !o.active);

exports["utils"] = () => filter(users, (o) => !o.active);

exports["lodash"] = () => lodash(users, (o) => !o.active);

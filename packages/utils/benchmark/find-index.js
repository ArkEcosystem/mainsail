const { findIndex } = require("../distribution");
const lodash = require("lodash/findIndex");

const users = [
	{
		user: "barney",
		active: false,
	},
	{
		user: "fred",
		active: false,
	},
	{
		user: "pebbles",
		active: true,
	},
];

exports["utils"] = () => findIndex(users, (o) => o.user === "fred");

exports["lodash"] = () => lodash(users, (o) => o.user === "fred");

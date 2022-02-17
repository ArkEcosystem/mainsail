const { findKey } = require("../distribution");
const lodash = require("lodash/findKey");

const users = {
	barney: {
		age: 36,
		active: true,
	},
	fred: {
		age: 40,
		active: false,
	},
	pebbles: {
		age: 1,
		active: true,
	},
};

exports["utils"] = () => findKey(users, (o) => o.age < 40);

exports["lodash"] = () => lodash(users, (o) => o.age < 40);

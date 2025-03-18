import { find } from "../distribution/find.js";
import lodashFind from "lodash/find.js";

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
	{
		user: "pebbles",
		age: 1,
		active: true,
	},
];

export const utils = () => find(users, (o) => o.age < 40);
export const lodash = () => lodashFind(users, (o) => o.age < 40);

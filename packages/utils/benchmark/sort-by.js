import { sortBy } from "../distribution/sort-by.js";
import lodashSortBy from "lodash/sortBy.js";

const users = [
	{
		user: "fred",
		age: 48,
	},
	{
		user: "barney",
		age: 36,
	},
	{
		user: "fred",
		age: 40,
	},
	{
		user: "barney",
		age: 34,
	},
];

export const utils = () => sortBy(users, ["user", "age"]);
export const lodash = () => lodashSortBy(users, ["user", "age"]);

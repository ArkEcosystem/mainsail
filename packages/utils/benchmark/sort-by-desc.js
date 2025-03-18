import { sortByDesc } from "../distribution/sort-by-desc.js";
import lodashSortBy from "lodash/orderBy.js";

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

export const utils = () => sortByDesc(users, ["user", "age"]);
export const lodash = () => lodashSortBy(users, ["user", "age"], ["desc", "desc"]);

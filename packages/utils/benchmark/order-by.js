import { orderBy } from "../distribution/order-by.js";
import lodashOrderBy from "lodash/orderBy.js";

const users = [
	{
		user: "fred",
		age: 48,
	},
	{
		user: "barney",
		age: 34,
	},
	{
		user: "fred",
		age: 40,
	},
	{
		user: "barney",
		age: 36,
	},
];

export const utils = () => orderBy(users, ["user", "age"], ["asc", "desc"]);
export const lodash = () => lodashOrderBy(users, ["user", "age"], ["asc", "desc"]);

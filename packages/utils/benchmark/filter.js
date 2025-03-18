import { filter } from "../distribution/filter.js";
import lodashFilter from "lodash/filter.js";

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

export const native = () => users.filter((o) => !o.active);
export const utils = () => filter(users, (o) => !o.active);
export const lodash = () => lodashFilter(users, (o) => !o.active);

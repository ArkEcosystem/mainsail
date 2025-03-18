import { findIndex } from "../distribution/find-index.js";
import lodashFindIndex from "lodash/findIndex.js";

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

export const utils = () => findIndex(users, (o) => o.user === "fred");
export const lodash = () => lodashFindIndex(users, (o) => o.user === "fred");

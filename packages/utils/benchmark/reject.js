import { reject } from "../distribution/reject.js";
import lodashReject from "lodash/reject.js";

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
];

export const utils = () => reject(users, (o) => o.active);
export const lodash = () => lodashReject(users, (o) => o.active);

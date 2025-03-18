import { partition } from "../distribution/partition.js";
import lodashPartition from "lodash/partition.js";

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
	{
		user: "pebbles",
		age: 1,
		active: false,
	},
];

export const utils = () => partition(users, (o) => o.active);
export const lodash = () => lodashPartition(users, (o) => o.active);

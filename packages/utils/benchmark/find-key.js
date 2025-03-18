import { findKey } from "../distribution/find-key.js";
import lodashFindKey from "lodash/findKey.js";

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

export const utils = () => findKey(users, (o) => o.age < 40);
export const lodash = () => lodashFindKey(users, (o) => o.age < 40);

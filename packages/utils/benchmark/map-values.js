import { mapValues } from "../distribution/map-values.js";
import lodashMapValues from "lodash/mapValues.js";

const users = {
	fred: {
		user: "fred",
		age: 40,
	},
	pebbles: {
		user: "pebbles",
		age: 1,
	},
};

export const utils = () => mapValues(users, (o) => o.age);
export const lodash = () => lodashMapValues(users, (o) => o.age);

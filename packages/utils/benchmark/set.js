import { set } from "../distribution/set.js";
import lodashSet from "lodash/set.js";
var object = {
	a: {
		b: {
			c: 3,
		},
	},
};

export const utils = () => set(object, "a.b.c", 4);
export const lodash = () => lodashSet(object, "a.b.c", 4);

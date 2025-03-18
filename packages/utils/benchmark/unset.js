import { unset } from "../distribution/unset.js";
import lodashUnset from "lodash/unset.js";

var object = {
	a: {
		b: {
			c: 7,
		},
	},
};

export const utils = () => unset(object, "a.b.c");
export const lodash = () => lodashUnset(object, "a.b.c");

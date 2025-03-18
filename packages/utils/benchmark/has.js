import { has } from "../distribution/has.js";
import lodashHas from "lodash/has.js";

var object = {
	a: {
		b: 2,
	},
};

export const utils = () => has(object, "a.b");
export const lodash = () => lodashHas(object, "a.b");

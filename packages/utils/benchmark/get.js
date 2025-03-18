import { get } from "../distribution/get.js";
import lodashGet from "lodash/get.js";

var object = {
	a: {
		b: {
			c: 3,
		},
	},
};

export const utils = () => get(object, "a.b.c");
export const lodash = () => lodashGet(object, "a.b.c");

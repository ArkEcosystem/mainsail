import { at } from "../distribution/at.js";
import lodashAt from "lodash/at.js";

var object = {
	a: {
		b: {
			c: 3,
		},
	},
	x: {
		y: {
			z: 4,
		},
	},
};

export const utils = () => at(object, ["a.b.c", "x.y.z"]);

export const lodash = () => lodashAt(object, ["a.b.c", "x.y.z"]);

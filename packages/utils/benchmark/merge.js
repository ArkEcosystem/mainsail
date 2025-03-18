import { merge } from "../distribution/merge.js";
import lodashMerge from "lodash/merge.js";

var object = {
	a: [
		{
			b: 2,
		},
		{
			d: 4,
		},
	],
};

var other = {
	a: [
		{
			c: 3,
		},
		{
			e: 5,
		},
	],
};

export const utils = () => merge(object, other);
export const lodash = () => lodashMerge(object, other);

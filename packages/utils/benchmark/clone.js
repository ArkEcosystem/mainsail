import { clone } from "../distribution/clone.js";
import lodashClone from "lodash/clone.js";

const objects = [
	{
		a: 1,
	},
	{
		b: 2,
	},
];

export const utils = () => clone(objects);
export const lodash = () => lodashClone(objects);

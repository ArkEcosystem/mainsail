import { maxBy } from "../distribution/max-by.js";
import lodashMaxBy from "lodash/maxBy.js";

const objects = [
	{
		n: 1,
	},
	{
		n: 2,
	},
];

export const utils = () => maxBy(objects, (o) => o.n);
export const lodash = () => lodashMaxBy(objects, (o) => o.n);

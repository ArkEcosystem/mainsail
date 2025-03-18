import { minBy } from "../distribution/min-by.js";
import lodashMinBy from "lodash/minBy.js";

const objects = [
	{
		n: 1,
	},
	{
		n: 2,
	},
];

export const utils = () => minBy(objects, (o) => o.n);
export const lodash = () => lodashMinBy(objects, (o) => o.n);

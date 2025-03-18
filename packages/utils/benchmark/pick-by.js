import { pickBy } from "../distribution/pick-by.js";
import { isNumber } from "../distribution/is-number.js";
import lodashPickBy from "lodash/pickBy.js";

export const utils = () =>
	pickBy(
		{
			a: 1,
			b: "2",
			c: 3,
		},
		isNumber,
	);
export const lodash = () =>
	lodashPickBy(
		{
			a: 1,
			b: "2",
			c: 3,
		},
		isNumber,
	);

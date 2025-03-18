import { pick } from "../distribution/pick.js";
import lodashPick from "lodash/pick.js";

export const utils = () =>
	pick(
		{
			a: 1,
			b: "2",
			c: 3,
		},
		["a", "c"],
	);

export const lodash = () =>
	lodashPick(
		{
			a: 1,
			b: "2",
			c: 3,
		},
		["a", "c"],
	);

import { keyBy } from "../distribution/key-by.js";
import lodashKeyBy from "lodash/keyBy.js";

const array = [
	{
		dir: "left",
		code: 97,
	},
	{
		dir: "right",
		code: 100,
	},
];

export const utils = () => keyBy(array, (o) => String.fromCharCode(o.code));
export const lodash = () => lodashKeyBy(array, (o) => String.fromCharCode(o.code));

import { parse } from "../distribution/parse.js";

const json = JSON.stringify(
	new Array(1000).fill({
		a: 1,
		b: 2,
		c: 3,
	}),
);

export const native = () => JSON.parse(json);
export const utils = () => parse(json);

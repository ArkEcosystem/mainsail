import { cloneDeep } from "../distribution/clone-deep.js";
import lodashCloneDeep from "lodash/cloneDeep.js";

const objects = [
	{
		a: 1,
	},
	{
		b: 2,
	},
];

export const utils = () => cloneDeep(objects);
export const lodash = () => lodashCloneDeep(objects);

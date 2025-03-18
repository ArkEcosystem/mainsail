import { flatten } from "../distribution/flatten.js";
import lodashFlatten from "lodash/flatten.js";

export const utils = () => flatten([1, [2, [3, [4]], 5]]);
export const lodash = () => lodashFlatten([1, [2, [3, [4]], 5]]);

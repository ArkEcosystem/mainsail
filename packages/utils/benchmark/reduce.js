import { reduce } from "../distribution/reduce.js";
import lodashReduce from "lodash/reduce.js";

export const native = () => [1, 2].reduce((sum, n) => sum + n, 0);
export const utils = () => reduce([1, 2], (sum, n) => sum + n, 0);
export const lodash = () => lodashReduce([1, 2], (sum, n) => sum + n, 0);

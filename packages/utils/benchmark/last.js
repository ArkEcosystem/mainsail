import { last } from "../distribution/last.js";
import lodashLast from "lodash/last.js";

export const utils = () => last([1, 2, 3]);
export const lodash = () => lodashLast([1, 2, 3]);

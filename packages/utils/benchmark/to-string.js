import { toString } from "../distribution/to-string.js";
import lodashToString from "lodash/toString.js";

export const utils = () => toString([1, 2, 3]);
export const lodash = () => lodashToString([1, 2, 3]);

import { isArray } from "../distribution/is-array.js";
import lodashIsArray from "lodash/isArray.js";

export const utils = () => isArray("abc");
export const lodash = () => lodashIsArray("abc");

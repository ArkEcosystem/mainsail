import { isUndefined } from "../distribution/is-undefined.js";
import lodashIsUndefined from "lodash/isUndefined.js";

export const utils = () => isUndefined("abc");
export const lodash = () => lodashIsUndefined("abc");

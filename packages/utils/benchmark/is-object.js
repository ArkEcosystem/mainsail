import { isObject } from "../distribution/is-object.js";
import lodashIsObject from "lodash/isObject.js";

export const utils = () => isObject("abc");
export const lodash = () => lodashIsObject("abc");

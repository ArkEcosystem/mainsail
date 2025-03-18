import { isFunction } from "../distribution/is-function.js";
import lodashIsFunction from "lodash/isFunction.js";

export const utils = () => isFunction("abc");
export const lodash = () => lodashIsFunction("abc");

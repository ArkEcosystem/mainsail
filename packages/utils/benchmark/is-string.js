import { isString } from "../distribution/is-string.js";
import lodashIsString from "lodash/isString.js";

export const utils = () => isString("abc");
export const lodash = () => lodashIsString("abc");

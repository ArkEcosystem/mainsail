import { isNumber } from "../distribution/is-number.js";
import lodashIsNumber from "lodash/isNumber.js";

export const utils = () => isNumber("abc");
export const lodash = () => lodashIsNumber("abc");

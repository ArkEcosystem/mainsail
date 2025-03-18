import { isBoolean } from "../distribution/is-boolean.js";
import lodashIsBoolean from "lodash/isBoolean.js";

export const utils = () => isBoolean("abc");
export const lodash = () => lodashIsBoolean("abc");

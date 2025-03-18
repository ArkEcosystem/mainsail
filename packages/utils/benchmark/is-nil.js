import { isNil } from "../distribution/is-nil.js";
import lodashIsNil from "lodash/isNil.js";

export const utils = () => isNil("abc");
export const lodash = () => lodashIsNil("abc");

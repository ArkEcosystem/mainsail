import { isEqual } from "../distribution/is-equal.js";
import lodashIsEqual from "lodash/isEqual.js";

export const utils = () => isEqual("abc", "abc");
export const lodash = () => lodashIsEqual("abc", "abc");

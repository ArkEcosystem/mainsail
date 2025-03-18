import { toUpper } from "../distribution/to-upper.js";
import lodashToUpper from "lodash/toUpper.js";

export const native = () => "__FOO_BAR__".toUpperCase();
export const utils = () => toUpper("__FOO_BAR__");
export const lodash = () => lodashToUpper("__FOO_BAR__");

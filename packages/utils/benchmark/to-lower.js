import { toLower } from "../distribution/to-lower.js";
import lodashToLower from "lodash/toLower.js";

export const native = () => "__FOO_BAR__".toLowerCase();
export const utils = () => toLower("__FOO_BAR__");
export const lodash = () => lodashToLower("__FOO_BAR__");

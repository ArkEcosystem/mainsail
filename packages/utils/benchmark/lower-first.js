import { lowerFirst } from "../distribution/lower-first.js";
import lodashLowerFirst from "lodash/lowerFirst.js";

export const utils = () => lowerFirst("__FOO_BAR__");
export const lodash = () => lodashLowerFirst("__FOO_BAR__");

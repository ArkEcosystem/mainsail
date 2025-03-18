import { lowerCase } from "../distribution/lower-case.js";
import lodashLowerCase from "lodash/lowerCase.js";

export const utils = () => lowerCase("__FOO_BAR__");
export const lodash = () => lodashLowerCase("__FOO_BAR__");

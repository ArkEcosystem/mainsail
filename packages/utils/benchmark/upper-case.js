import { upperCase } from "../distribution/upper-case.js";
import lodashUpperCase from "lodash/upperCase.js";

export const utils = () => upperCase("__FOO_BAR__");
export const lodash = () => lodashUpperCase("__FOO_BAR__");

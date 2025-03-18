import { upperFirst } from "../distribution/upper-first.js";
import lodashUpperFirst from "lodash/upperFirst.js";

export const utils = () => upperFirst("__FOO_BAR__");
export const lodash = () => lodashUpperFirst("__FOO_BAR__");

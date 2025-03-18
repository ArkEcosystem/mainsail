import { concat } from "../distribution/concat.js";
import lodashConcat from "lodash/concat.js";

export const utils = () => concat([1], [2]);
export const lodash = () => lodashConcat([1], [2]);

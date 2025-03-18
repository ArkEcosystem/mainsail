import { fill } from "../distribution/fill.js";
import lodashFill from "lodash/fill.js";

export const utils = () => fill([1, 2, 3], "a");
export const lodash = () => lodashFill([1, 2, 3], "a");

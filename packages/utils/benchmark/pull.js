import { pull } from "../distribution/pull.js";
import lodashPull from "lodash/pull.js";

export const utils = () => pull(["a", "b", "c", "a", "b", "c"], "a", "c");
export const lodash = () => lodashPull(["a", "b", "c", "a", "b", "c"], "a", "c");

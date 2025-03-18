import { pullAll } from "../distribution/pull-all.js";
import lodashPullAll from "lodash/pullAll.js";

export const utils = () => pullAll(["a", "b", "c", "a", "b", "c"], "a", "c");
export const lodash = () => lodashPullAll(["a", "b", "c", "a", "b", "c"], "a", "c");

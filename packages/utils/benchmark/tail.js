import { tail } from "../distribution/tail.js";
import lodashTail from "lodash/tail.js";

export const utils = () => tail([1, 2, 3]);
export const lodash = () => lodashTail([1, 2, 3]);

import { min } from "../distribution/min.js";
import lodashMin from "lodash/min.js";

export const utils = () => min([4, 2, 8, 6]);
export const lodash = () => lodashMin([4, 2, 8, 6]);

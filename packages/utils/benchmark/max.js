import { max } from "../distribution/max.js";
import lodashMax from "lodash/max.js";

export const utils = () => max([4, 2, 8, 6]);
export const lodash = () => lodashMax([4, 2, 8, 6]);

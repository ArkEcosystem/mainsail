import { sample } from "../distribution/sample.js";
import lodashSample from "lodash/sample.js";

export const utils = () => sample([1, 2, 3, 4]);
export const lodash = () => lodashSample([1, 2, 3, 4]);

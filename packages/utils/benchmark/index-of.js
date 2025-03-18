import { indexOf } from "../distribution/index-of.js";
import lodashIndexOf from "lodash/indexOf.js";

export const utils = () => indexOf([1, 2, 1, 2], 2);
export const lodash = () => lodashIndexOf([1, 2, 1, 2], 2);

import { union } from "../distribution/union.js";
import lodashUnion from "lodash/union.js";

export const utils = () => union([2], [1, 2]);
export const lodash = () => lodashUnion([2], [1, 2]);

import { uniq } from "../distribution/uniq.js";
import lodashUniq from "lodash/uniq.js";

export const utils = () => uniq([2, 1, 2]);
export const lodash = () => lodashUniq([2, 1, 2]);

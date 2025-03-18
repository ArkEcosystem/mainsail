import { includes } from "../distribution/includes.js";
import lodashIncludes from "lodash/includes.js";

export const utils = () => includes([1, 2, 3], 1);
export const lodash = () => lodashIncludes([1, 2, 3], 1);

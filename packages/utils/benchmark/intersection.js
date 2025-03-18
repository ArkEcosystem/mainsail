import { intersection } from "../distribution/intersection.js";
import lodashIntersection from "lodash/intersection.js";

export const utils = () => intersection([2, 1], [2, 3]);
export const lodash = () => lodashIntersection([2, 1], [2, 3]);

import { groupBy } from "../distribution/group-by.js";
import lodashGroupBy from "lodash/groupBy.js";

export const utils = () => groupBy([6.1, 4.2, 6.3], Math.floor);
export const lodash = () => lodashGroupBy([6.1, 4.2, 6.3], Math.floor);

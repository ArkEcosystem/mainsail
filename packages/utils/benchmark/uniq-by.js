import { uniqBy } from "../distribution/uniq-by.js";
import lodashUniqBy from "lodash/uniqBy.js";

export const utils = () => uniqBy([2.1, 1.2, 2.3], Math.floor);
export const lodash = () => lodashUniqBy([2.1, 1.2, 2.3], Math.floor);

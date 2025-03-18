import { unionBy } from "../distribution/union-by.js";
import lodashUnionBy from "lodash/unionBy.js";

export const utils = () => unionBy([2.1], [1.2, 2.3], Math.floor);
export const lodash = () => lodashUnionBy([2.1], [1.2, 2.3], Math.floor);

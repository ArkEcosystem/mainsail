import { omitBy } from "../distribution/omit-by.js";
import { isNumber } from "../distribution/is-number.js";
import lodashOmitBy from "lodash/omitBy.js";

export const utils = () => omitBy({ a: 1, b: "2", c: 3 }, isNumber);
export const lodash = () => lodashOmitBy({ a: 1, b: "2", c: 3 }, isNumber);

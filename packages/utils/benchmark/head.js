import { head } from "../distribution/head.js";
import lodashHead from "lodash/head.js";

export const utils = () => head([1, 2, 3]);
export const lodash = () => lodashHead([1, 2, 3]);

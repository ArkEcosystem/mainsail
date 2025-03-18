import { take } from "../distribution/take.js";
import lodashTake from "lodash/take.js";

export const utils = () => take([1, 2, 3], 2);
export const lodash = () => lodashTake([1, 2, 3], 2);

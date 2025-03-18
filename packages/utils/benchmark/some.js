import { some } from "../distribution/some.js";
import lodashSome from "lodash/some.js";

export const native = () => [null, 0, "yes", false].some(Boolean);
export const utils = () => some([null, 0, "yes", false], Boolean);
export const lodash = () => lodashSome([null, 0, "yes", false], Boolean);

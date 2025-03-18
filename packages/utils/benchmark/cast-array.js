import { castArray } from "../distribution/cast-array.js";
import lodashCastArray from "lodash/castArray.js";

export const utils = () => castArray("abc");
export const lodash = () => lodashCastArray("abc");

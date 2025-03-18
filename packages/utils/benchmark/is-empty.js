import { isEmpty } from "../distribution/is-empty.js";
import lodashIsEmpty from "lodash/isEmpty.js";

export const utils = () => isEmpty("abc");
export const lodash = () => lodashIsEmpty("abc");

import { isSymbol } from "../distribution/is-symbol.js";
import lodashIsSymbol from "lodash/isSymbol.js";

export const utils = () => isSymbol("abc");
export const lodash = () => lodashIsSymbol("abc");

import { words } from "../distribution/words.js";
import lodashWords from "lodash/words.js";

export const utils = () => words("fred, barney, & pebbles");
export const lodash = () => lodashWords("fred, barney, & pebbles");

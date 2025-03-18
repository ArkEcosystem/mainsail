import { shuffle } from "../distribution/shuffle.js";
import lodashShuffle from "lodash/shuffle.js";

export const utils = () => shuffle([1, 2, 3, 4]);
export const lodash = () => lodashShuffle([1, 2, 3, 4]);

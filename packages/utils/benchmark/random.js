import { randomNumber } from "../distribution/random-number.js";
import lodashRandomNumber from "lodash/random.js";

export const utils = () => randomNumber(1, 10);
export const lodash = () => lodashRandomNumber(1, 10);

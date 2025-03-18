import { BigNumber } from "../distribution/big-number.js";
import BigNumberJS from "bignumber.js";
import BigJS from "bignumber.js";
import BigNumber2 from "big-number";
import JSBI from "jsbi";

export const native = () => BigInt("1111222233334444555566");
export const utils = () => new BigNumber("1111222233334444555566");
export const bignumberJs = () => new BigNumberJS("1111222233334444555566");
export const bigJs = () => new BigJS("1111222233334444555566");
export const bigNumber = () => new BigNumber2("1111222233334444555566");
export const jsbi = () => JSBI.BigInt("1111222233334444555566");

const { BigNumber } = require("../dist");
const BigNumberJS = require("bignumber.js");
const BigJS = require("bignumber.js");
const BigNumber2 = require("big-number");
const JSBI = require("jsbi");

exports["native"] = () => BigInt("1111222233334444555566");

exports["utils"] = () => new BigNumber("1111222233334444555566");

exports["bignumber.js"] = () => new BigNumberJS("1111222233334444555566");

exports["big.js"] = () => new BigJS("1111222233334444555566");

exports["big-number"] = () => new BigNumber2("1111222233334444555566");

exports["jsbi"] = () => JSBI.BigInt("1111222233334444555566");

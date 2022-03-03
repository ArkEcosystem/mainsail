import { Crypto, State } from "@arkecosystem/core-contracts";
import { BigNumber } from "@arkecosystem/utils";

import { calculate as calculateSupply } from "./supply-calculator";

const toDecimal = (voteBalance: BigNumber, totalSupply: BigNumber): number => {
	const decimals = 2;
	const exponent: number = totalSupply.toString().length - voteBalance.toString().length + 4;

	// @ts-ignore
	const div = voteBalance.times(Math.pow(10, exponent)).dividedBy(totalSupply) / Math.pow(10, exponent - decimals);

	return +Number(div).toFixed(2);
};

export const calculateApproval = (
	validator: State.Wallet,
	height = 1,
	configuration: Crypto.IConfiguration,
): number => {
	const totalSupply: BigNumber = BigNumber.make(calculateSupply(height, configuration));
	const voteBalance: BigNumber = validator.getAttribute("validator.voteBalance");

	return toDecimal(voteBalance, totalSupply);
};

export const calculateForgedTotal = (wallet: State.Wallet): string => {
	const validator: State.WalletValidatorAttributes = wallet.getAttribute("validator");
	const forgedFees: BigNumber = BigNumber.make(validator.forgedFees);
	const forgedRewards: BigNumber = BigNumber.make(validator.forgedRewards);

	return forgedFees.plus(forgedRewards).toFixed();
};

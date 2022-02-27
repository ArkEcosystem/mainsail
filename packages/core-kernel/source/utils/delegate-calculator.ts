import { IConfiguration } from "@arkecosystem/core-crypto-contracts";
import { BigNumber } from "@arkecosystem/utils";

import { Wallet, WalletDelegateAttributes } from "../contracts/state";
import { calculate as calculateSupply } from "./supply-calculator";

const toDecimal = (voteBalance: BigNumber, totalSupply: BigNumber): number => {
	const decimals = 2;
	const exponent: number = totalSupply.toString().length - voteBalance.toString().length + 4;

	// @ts-ignore
	const div = voteBalance.times(Math.pow(10, exponent)).dividedBy(totalSupply) / Math.pow(10, exponent - decimals);

	return +Number(div).toFixed(2);
};

export const calculateApproval = (delegate: Wallet, height = 1, configuration: IConfiguration): number => {
	const totalSupply: BigNumber = BigNumber.make(calculateSupply(height, configuration));
	const voteBalance: BigNumber = delegate.getAttribute("delegate.voteBalance");

	return toDecimal(voteBalance, totalSupply);
};

export const calculateForgedTotal = (wallet: Wallet): string => {
	const delegate: WalletDelegateAttributes = wallet.getAttribute("delegate");
	const forgedFees: BigNumber = BigNumber.make(delegate.forgedFees);
	const forgedRewards: BigNumber = BigNumber.make(delegate.forgedRewards);

	return forgedFees.plus(forgedRewards).toFixed();
};

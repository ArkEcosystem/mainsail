import { Contracts } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

const calculate = (transaction: Contracts.Crypto.Transaction): Utils.BigNumber =>
	Utils.BigNumber.make(transaction.data.gasPrice).times(transaction.data.gasLimit);

const calculateConsumed = (gasPrice: number, gasUsed: number): Utils.BigNumber =>
	Utils.BigNumber.make(gasPrice).times(gasUsed);

export { calculate, calculateConsumed };

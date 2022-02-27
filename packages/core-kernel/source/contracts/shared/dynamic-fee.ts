import Interfaces from "@arkecosystem/core-crypto-contracts";

export interface DynamicFeeContext {
	transaction: Interfaces.ITransaction;
	addonBytes: number;
	satoshiPerByte: number;
	height: number;
}

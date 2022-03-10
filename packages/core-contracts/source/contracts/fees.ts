import { BigNumber } from "@arkecosystem/utils";

export interface IFeeRegistry {
	get(transaction: string, version: number): BigNumber;

	set(transaction: string, version: number, fee: BigNumber): void;
}

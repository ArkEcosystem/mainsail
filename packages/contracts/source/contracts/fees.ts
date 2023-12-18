import { BigNumber } from "@mainsail/utils";

export interface FeeRegistry {
	get(transaction: string, version: number): BigNumber;

	set(transaction: string, version: number, fee: BigNumber): void;
}

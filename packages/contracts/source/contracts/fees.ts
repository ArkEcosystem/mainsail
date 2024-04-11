import { BigNumber } from "@mainsail/utils";

export interface FeeRegistry {
	get(transaction: string, version?: number): BigNumber;

	set(transaction: string, fee?: BigNumber, version?: number): void;
}

export type StaticFees = Record<string, number>;
export interface Fees {
	staticFees: StaticFees;
}

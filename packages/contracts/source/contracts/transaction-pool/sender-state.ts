import { BigNumber } from "@mainsail/utils";

import { Transaction } from "../crypto/transactions.js";

export interface SenderState {
	configure(address: string, legacyAddress?: string): Promise<SenderState>;
	reset(): Promise<void>;
	apply(transaction: Transaction): Promise<void>;
	revert(transaction: Transaction): void;
	replace(oldTransaction: Transaction, newTransaction: Transaction, nonceOffset: BigNumber): Promise<boolean>;
	getNonce(): BigNumber;
}

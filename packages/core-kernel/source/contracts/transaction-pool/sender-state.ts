import Interfaces from "@arkecosystem/core-crypto-contracts";

export interface SenderState {
	apply(transaction: Interfaces.ITransaction): Promise<void>;
	revert(transaction: Interfaces.ITransaction): Promise<void>;
}

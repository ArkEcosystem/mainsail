import type { Transaction } from "./crypto/index.js";
import type { BlockContext, Instance, TransactionReceipt } from "./evm/index.js";
import type { Wallet } from "./state/index.js";

export type TransactionHandlerContext = {
	evm: {
		instance: Instance;
		blockContext: BlockContext;
	};
};

export interface TransactionHandler {
	throwIfCannotBeApplied(transaction: Transaction, sender: Wallet, evm: Instance): Promise<void>;

	apply(context: TransactionHandlerContext, transaction: Transaction): Promise<TransactionReceipt>;
}

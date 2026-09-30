import type { Block, Transaction } from "../crypto/index.js";
import type { TransactionReceipt } from "../evm/index.js";

export interface TransactionProcessor {
	process(block: Block, transaction: Transaction): Promise<TransactionReceipt>;
}

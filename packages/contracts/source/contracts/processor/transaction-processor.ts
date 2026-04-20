import type { Transaction } from "../crypto/index.js";
import type { TransactionReceipt } from "../evm/index.js";
import type { ProcessableUnit } from "./processable-unit.js";

export interface TransactionProcessor {
	process(unit: ProcessableUnit, transaction: Transaction): Promise<TransactionReceipt>;
}

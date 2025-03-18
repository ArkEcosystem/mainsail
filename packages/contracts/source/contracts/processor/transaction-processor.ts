import { Transaction } from "../crypto/index.js";
import { TransactionReceipt } from "../evm/index.js";
import { ProcessableUnit } from "./processable-unit.js";

export interface TransactionProcessor {
	process(unit: ProcessableUnit, transaction: Transaction): Promise<TransactionReceipt>;
}

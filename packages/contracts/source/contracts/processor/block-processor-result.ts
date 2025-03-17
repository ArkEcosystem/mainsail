import { TransactionReceipt } from "../evm/evm.js";

export interface BlockProcessorResult {
	success: boolean;
	receipts: Map<string, TransactionReceipt>;
	gasUsed: number;
}

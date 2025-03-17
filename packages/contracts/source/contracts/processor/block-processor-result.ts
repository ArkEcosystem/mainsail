import { TransactionReceipt } from "../evm/index.js";

export interface BlockProcessorResult {
	success: boolean;
	receipts: Map<string, TransactionReceipt>;
	gasUsed: number;
}

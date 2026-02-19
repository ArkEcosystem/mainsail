import type { BigNumber } from "@mainsail/utils";

import type { TransactionReceipt } from "../evm/evm.js";

export interface BlockProcessorResult {
	success: boolean;
	receipts: Map<string, TransactionReceipt>;
	gasUsed: number;
	feeUsed: BigNumber;
}

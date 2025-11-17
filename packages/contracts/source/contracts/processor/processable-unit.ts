import type { Block } from "../crypto/block.js";
import type { Commit } from "../crypto/commit.js";
import type { AccountUpdate } from "../evm/evm.js";
import type { BlockProcessorResult } from "./block-processor-result.js";

export interface ProcessableUnit {
	readonly blockNumber: number;
	readonly round: number;
	hasProcessorResult(): boolean;
	getProcessorResult(): BlockProcessorResult;
	setProcessorResult(processorResult: BlockProcessorResult): void;
	setAccountUpdates(accounts: Array<AccountUpdate>): void;
	getAccountUpdates(): Array<AccountUpdate>;
	getBlock(): Block;
	getCommit(): Promise<Commit>;
}

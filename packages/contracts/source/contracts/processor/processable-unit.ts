import { Block } from "../crypto/block.js";
import { Commit } from "../crypto/commit.js";
import { AccountUpdate } from "../evm/evm.js";
import { BlockProcessorResult } from "./block-processor-result.js";

export interface ProcessableUnit {
	readonly height: number;
	readonly round: number;
	hasProcessorResult(): boolean;
	getProcessorResult(): BlockProcessorResult;
	setProcessorResult(processorResult: BlockProcessorResult): void;
	setAccountUpdates(accounts: Array<AccountUpdate>): void;
	getAccountUpdates(): Array<AccountUpdate>;
	getBlock(): Block;
	getCommit(): Promise<Commit>;
}

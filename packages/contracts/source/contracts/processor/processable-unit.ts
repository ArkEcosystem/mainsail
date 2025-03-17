import { Block, Commit } from "../crypto/index.js";
import { AccountUpdate } from "../evm/index.js";
import { BlockProcessorResult } from "./block-processor-result.js";

export interface ProcessableUnit {
	readonly height: number;
	readonly round: number;
	readonly persist: boolean;
	hasProcessorResult(): boolean;
	getProcessorResult(): BlockProcessorResult;
	setProcessorResult(processorResult: BlockProcessorResult): void;
	setAccountUpdates(accounts: Array<AccountUpdate>): void;
	getAccountUpdates(): Array<AccountUpdate>;
	getBlock(): Block;
	getCommit(): Promise<Commit>;
}

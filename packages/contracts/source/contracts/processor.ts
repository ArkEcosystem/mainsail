import { Block, Commit, Transaction } from "./crypto/index.js";
import { AccountUpdate, TransactionReceipt } from "./evm/evm.js";

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

export interface Handler {
	execute(unit: ProcessableUnit): Promise<void>;
}

export interface BlockProcessor {
	process(unit: ProcessableUnit): Promise<BlockProcessorResult>;
	commit(unit: ProcessableUnit): Promise<void>;
}

export interface BlockProcessorResult {
	success: boolean;
	receipts: Map<string, TransactionReceipt>;
	gasUsed: number;
}

export interface TransactionProcessor {
	process(unit: ProcessableUnit, transaction: Transaction): Promise<TransactionReceipt>;
}

export interface Verifier {
	verify(unit: ProcessableUnit): Promise<void>;
}

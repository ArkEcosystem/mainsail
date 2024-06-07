import { Block, Commit, Transaction } from "./crypto/index.js";
import { Store } from "./state/index.js";

export interface ProcessableUnit {
	readonly height: number;
	readonly round: number;
	readonly persist: boolean;
	readonly store: Store;
	hasProcessorResult(): boolean;
	getProcessorResult(): BlockProcessorResult;
	setProcessorResult(processorResult: BlockProcessorResult): void;
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
	gasUsed: number;
}

export interface TransactionProcessor {
	process(unit: ProcessableUnit, transaction: Transaction): Promise<TransactionProcessorResult>;
}

export interface TransactionProcessorResult {
	readonly gasUsed: number;
}

export interface Verifier {
	verify(unit: ProcessableUnit): Promise<void>;
}

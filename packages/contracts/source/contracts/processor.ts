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
	process(unit: ProcessableUnit, transaction: Transaction): Promise<TransactionProcessorResult>;
}

export interface TransactionProcessorResult {
	readonly gasUsed: number;
	// only present for evm-calls, unlike 'gasUsed' which is also present for native transactions
	readonly receipt?: TransactionReceipt;
}

export interface Verifier {
	verify(unit: ProcessableUnit): Promise<void>;
}

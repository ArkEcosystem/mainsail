import { Block, Transaction } from "./crypto";
import { Commit } from "./crypto/commit";
import { Store, WalletRepository } from "./state";

export interface ProcessableUnit {
	readonly height: number;
	readonly round: number;
	readonly persist: boolean;
	readonly store: Store;
	hasProcessorResult(): boolean;
	getProcessorResult(): boolean;
	setProcessorResult(processorResult: boolean): void;
	getBlock(): Block;
	getCommit(): Promise<Commit>;
}

export interface Handler {
	execute(unit: ProcessableUnit): Promise<boolean>;
}

export interface BlockProcessor {
	process(unit: ProcessableUnit): Promise<boolean>;
	commit(unit: ProcessableUnit): Promise<void>;
}

export interface TransactionProcessor {
	process(walletRepository: WalletRepository, transaction: Transaction): Promise<void>;
}

export interface Verifier {
	verify(unit: ProcessableUnit): Promise<boolean>;
}

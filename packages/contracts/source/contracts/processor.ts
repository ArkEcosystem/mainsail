import { Block, CommittedBlock, Transaction } from "./crypto";
import { WalletRepositoryClone } from "./state";

export interface ProcessableUnit {
	readonly height: number;
	readonly round: number;
	readonly persist: boolean;
	getWalletRepository(): WalletRepositoryClone;
	hasProcessorResult(): boolean;
	getProcessorResult(): boolean;
	setProcessorResult(processorResult: boolean): void;
	getBlock(): Block;
	getCommittedBlock(): Promise<CommittedBlock>;
}

export interface Handler {
	execute(unit: ProcessableUnit): Promise<boolean>;
}

export interface BlockProcessor {
	process(unit: ProcessableUnit): Promise<boolean>;
	commit(unit: ProcessableUnit): Promise<void>;
}

export interface TransactionProcessor {
	process(walletRepository: WalletRepositoryClone, transaction: Transaction): Promise<void>;
}

export interface Verifier {
	verify(unit: ProcessableUnit): Promise<boolean>;
}

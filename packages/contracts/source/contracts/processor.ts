import { IBlock, ICommittedBlock, ITransaction } from "./crypto";
import { WalletRepositoryClone } from "./state";

export interface IProcessableUnit {
	readonly height: number;
	readonly round: number;
	readonly persist: boolean;
	getWalletRepository(): WalletRepositoryClone;
	hasProcessorResult(): boolean;
	getProcessorResult(): boolean;
	setProcessorResult(processorResult: boolean): void;
	getBlock(): IBlock;
	getCommittedBlock(): Promise<ICommittedBlock>;
}

export interface Handler {
	execute(unit: IProcessableUnit): Promise<boolean>;
}

export interface BlockProcessor {
	process(unit: IProcessableUnit): Promise<boolean>;
	commit(unit: IProcessableUnit): Promise<void>;
}

export interface TransactionProcessor {
	process(walletRepository: WalletRepositoryClone, transaction: ITransaction): Promise<void>;
}

export interface Verifier {
	verify(unit: IProcessableUnit): Promise<boolean>;
}

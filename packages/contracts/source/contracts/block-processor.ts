import { IBlock, ICommittedBlock } from "./crypto";
import { WalletRepositoryClone } from "./state";

export interface IProcessableUnit {
	readonly height: number;
	readonly round: number;
	getWalletRepository(): WalletRepositoryClone;
	getProcessorResult(): boolean;
	setProcessorResult(processorResult: boolean): void;
	getBlock(): IBlock;
	getProposedCommitBlock(): ICommittedBlock;
}

export interface Handler {
	execute(roundState: IProcessableUnit): Promise<boolean>;
}

export interface Processor {
	process(roundState: IProcessableUnit): Promise<boolean>;
	commit(roundState: IProcessableUnit): Promise<void>;
}

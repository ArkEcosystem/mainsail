import { IBlock, ICommittedBlock } from "./crypto";
import { WalletRepositoryClone } from "./state";

export interface IProcessableUnit {
	readonly height: number;
	readonly round: number;
	getWalletRepository(): WalletRepositoryClone;
	hasProcessorResult(): boolean;
	getProcessorResult(): boolean;
	setProcessorResult(processorResult: boolean): void;
	getBlock(): IBlock;
	getProposedCommitBlock(): Promise<ICommittedBlock>;
}

export interface Handler {
	execute(unit: IProcessableUnit): Promise<boolean>;
}

export interface Processor {
	process(unit: IProcessableUnit): Promise<boolean>;
	commit(unit: IProcessableUnit): Promise<void>;
}

export interface Verifier {
	verify(unit: IProcessableUnit): Promise<boolean>;
}

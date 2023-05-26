import { IBlock, IKeyPair, IPrecommit, IPrevote, IProposal } from "./crypto";
import { WalletRepositoryClone } from "./state";

export interface IRoundState {
	getWalletRepository(): WalletRepositoryClone;
	getProposal(): IProposal | undefined;
	setProposal(proposal: IProposal): void;
	setProcessorResult(processorResult: boolean): void;
	getProcessorResult(): boolean;
}

export interface IConsensusService {
	run(): Promise<void>;
	onProposal(roudnState: IRoundState): Promise<void>;
	onMajorityPrevote(roundState: IRoundState): Promise<void>;
	onMajorityPrecommit(roundState: IRoundState): Promise<void>;
	onTimeoutPropose(height: number, round: number): Promise<void>;
	onTimeoutPrevote(height: number, round: number): Promise<void>;
	onTimeoutPrecommit(height: number, round: number): Promise<void>;
}

export interface IHandler {
	onProposal(proposal: IProposal): Promise<void>;
	onPrevote(prevote: IPrevote): Promise<void>;
	onPrecommit(precommit: IPrecommit): Promise<void>;
}

export interface IBroadcaster {
	broadcastProposal(proposal: IProposal): Promise<void>;
	broadcastPrevote(prevote: IPrevote): Promise<void>;
	broadcastPrecommit(precommit: IPrecommit): Promise<void>;
}

export interface IScheduler {
	scheduleTimeoutPropose(height: number, round: number): Promise<void>;
	scheduleTimeoutPrevote(height: number, round: number): Promise<void>;
	scheduleTimeoutPrecommit(height: number, round: number): Promise<void>;
}

export interface IValidator {
	configure(publicKey: string, keyPair: IKeyPair): IValidator;
	getConsensusPublicKey(): string;
	prepareBlock(height: number, round: number): Promise<IBlock>;
	propose(height: number, round: number, block: IBlock): Promise<IProposal>;
	prevote(height: number, round: number, blockId: string | undefined): Promise<IPrevote>;
	precommit(height: number, round: number, blockId: string | undefined): Promise<IPrecommit>;
}

export interface IValidatorRepository {
	getValidator(publicKey: string): IValidator;
	getValidators(publicKeys: string[]): IValidator[];
}

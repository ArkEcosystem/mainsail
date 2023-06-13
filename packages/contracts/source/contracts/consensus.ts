import { IBlock, ICommittedBlock, IKeyPair, IPrecommit, IPrevote, IProposal } from "./crypto";
import { WalletRepositoryClone } from "./state";

// TODO: Move to crypto
export interface IValidatorSetMajority {
	aggSignature: string;
	aggPublicKey: string;
	validatorSet: Set<Buffer>;
}

export interface IRoundState {
	readonly height: number;
	readonly round: number;
	readonly validators: string[];
	readonly proposer: string;
	getWalletRepository(): WalletRepositoryClone;
	getProposal(): IProposal | undefined;
	addProposal(proposal: IProposal): boolean;
	setProcessorResult(processorResult: boolean): void;
	getProcessorResult(): boolean;
	addPrevote(prevote: IPrevote): boolean;
	addPrecommit(precommit: IPrecommit): boolean;
	hasMajorityPrevotes(): boolean;
	hasMajorityPrevotesAny(): boolean;
	hasMajorityPrevotesNull(): boolean;
	hasMajorityPrecommits(): boolean;
	hasMajorityPrecommitsAny(): boolean;
	hasMinorityPrevotesOrPrecommits(): boolean;
	aggregateMajorityPrevotes(): Promise<IValidatorSetMajority>;
	aggregateMajorityPrecommits(): Promise<IValidatorSetMajority>;
	getProposedCommitBlock(): Promise<ICommittedBlock>;
}

export interface IConsensusService {
	run(): Promise<void>;
	getHeight(): number;
	getRound(): number;
	onProposal(roundState: IRoundState): Promise<void>;
	onProposalLocked(roudnState: IRoundState): Promise<void>;
	onMajorityPrevote(roundState: IRoundState): Promise<void>;
	onMajorityPrevoteAny(roundState: IRoundState): Promise<void>;
	onMajorityPrevoteNull(roundState: IRoundState): Promise<void>;
	onMajorityPrecommitAny(roundState: IRoundState): Promise<void>;
	onMajorityPrecommit(roundState: IRoundState): Promise<void>;
	onMinorityWithHigherRound(roundState: IRoundState): Promise<void>;
	onTimeoutPropose(height: number, round: number): Promise<void>;
	onTimeoutPrevote(height: number, round: number): Promise<void>;
	onTimeoutPrecommit(height: number, round: number): Promise<void>;
}

export interface IHandler {
	onProposal(proposal: IProposal): Promise<void>;
	onPrevote(prevote: IPrevote): Promise<void>;
	onPrecommit(precommit: IPrecommit): Promise<void>;
}

export interface IScheduler {
	delayProposal(): Promise<void>;
	scheduleTimeoutPropose(height: number, round: number): Promise<void>;
	scheduleTimeoutPrevote(height: number, round: number): Promise<void>;
	scheduleTimeoutPrecommit(height: number, round: number): Promise<void>;
	clear(): void;
}

export interface IValidator {
	configure(publicKey: string, keyPair: IKeyPair): IValidator;
	getConsensusPublicKey(): string;
	prepareBlock(height: number, round: number): Promise<IBlock>;
	propose(height: number, round: number, block: IBlock, validRound: number | undefined): Promise<IProposal>;
	prevote(height: number, round: number, blockId: string | undefined): Promise<IPrevote>;
	precommit(height: number, round: number, blockId: string | undefined): Promise<IPrecommit>;
}

export interface IValidatorRepository {
	getValidator(publicKey: string): IValidator | undefined;
	getValidators(publicKeys: string[]): IValidator[];
}

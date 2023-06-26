import {
	IBlock,
	ICommittedBlock,
	IKeyPair,
	IPrecommit,
	IPrecommitData,
	IPrevote,
	IPrevoteData,
	IProposal,
	IProposalData,
	IProposalLockProof,
	IValidatorSetMajority,
} from "./crypto";
import { WalletRepositoryClone } from "./state";

export interface IRoundState {
	readonly height: number;
	readonly round: number;
	readonly validators: string[];
	readonly proposer: string;
	getWalletRepository(): WalletRepositoryClone;
	getProposal(): IProposal | undefined;
	addProposal(proposal: IProposal): Promise<boolean>;
	setProcessorResult(processorResult: boolean): void;
	getProcessorResult(): boolean;
	addPrevote(prevote: IPrevote): Promise<boolean>;
	addPrecommit(precommit: IPrecommit): Promise<boolean>;
	hasMajorityPrevotes(): boolean;
	hasMajorityPrevotesAny(): boolean;
	hasMajorityPrevotesNull(): boolean;
	hasMajorityPrecommits(): boolean;
	hasMajorityPrecommitsAny(): boolean;
	hasMinorityPrevotesOrPrecommits(): boolean;
	getPrevote(validatorIndex: number): IPrevote | undefined;
	getPrecommit(validatorIndex: number): IPrecommit | undefined;
	getValidatorsSignedPrevote(): boolean[];
	getValidatorsSignedPrecommit(): boolean[];
	hasValidProposalLockProof(): Promise<boolean>;
	aggregateMajorityPrevotes(): Promise<IValidatorSetMajority>;
	aggregateMajorityPrecommits(): Promise<IValidatorSetMajority>;
	getProposalLockProof(): Promise<IProposalLockProof>;
	getProposedCommitBlock(): Promise<ICommittedBlock>;

	toData(): IRoundStateData;
	fromData(data: IRoundStateData): Promise<IRoundState>;
}

export interface IRoundStateData {
	readonly height: number;
	readonly round: number;
	readonly processorResult: boolean | undefined;
	readonly validatorsSignedPrevote: boolean[];
	readonly validatorsSignedPrecommit: boolean[];

	readonly proposer: string;

	readonly proposal: IProposalData | null;
	readonly prevotes: Record<string, IPrevoteData>;
	readonly prevotesCount: Record<string, number>;
	readonly precommits: Record<string, IPrecommitData>;
	readonly precommitsCount: Record<string, number>;
	// consensus key => wallet key
	readonly validators: Record<string, string>;
}

export interface IConsensusStateData {
	readonly height: number;
	readonly round: number;
	readonly step: Step;
	readonly validRound?: number;
	readonly lockedRound?: number;
	readonly lockedValue: IRoundStateData | null;
	readonly validValue: IRoundStateData | null;
}

export interface IRoundStateRepository {
	getRoundState(height: number, round: number): Promise<IRoundState>;
}

export interface IConsensusService {
	run(): Promise<void>;
	getHeight(): number;
	getRound(): number;
	getStep(): Step;
	getState(): IConsensusState;
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

export interface IConsensusState {
	readonly height: number;
	readonly round: number;
	readonly step: Step;
	readonly validRound?: number;
	readonly lockedRound?: number;
	readonly lockedValue?: IRoundState;
	readonly validValue?: IRoundState;
}

export interface IConsensusStorage {
	saveState(state: IConsensusState): Promise<void>;
	getState(): Promise<IConsensusState | undefined>;
}

export interface IHandler {
	handle(roundState: IRoundState): Promise<void>;
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
	propose(
		height: number,
		round: number,
		block: IBlock,
		lockProof?: IProposalLockProof,
		validRound?: number,
	): Promise<IProposal>;
	prevote(height: number, round: number, blockId: string | undefined): Promise<IPrevote>;
	precommit(height: number, round: number, blockId: string | undefined): Promise<IPrecommit>;
}

export interface IValidatorRepository {
	getValidator(publicKey: string): IValidator | undefined;
	getValidators(publicKeys: string[]): IValidator[];
}

export enum Step {
	Propose = 0,
	Prevote = 1,
	Precommit = 2,
}

import { IProcessableUnit } from "./block-processor";
import {
	IBlock,
	IBlockCommit,
	ICommittedBlock,
	IKeyPair,
	IPrecommit,
	IPrevote,
	IProposal,
	IProposalLockProof,
	IValidatorSetMajority,
} from "./crypto";

export interface IRoundState extends IProcessableUnit {
	readonly validators: string[];
	readonly proposer: string;
	getProposal(): IProposal | undefined;
	hasProposal(): boolean;
	hasPrevote(validator: IValidator): boolean;
	hasPrecommit(validator: IValidator): boolean;
	addProposal(proposal: IProposal): Promise<boolean>;
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
}

export interface IConsensusStateData {
	readonly height: number;
	readonly round: number;
	readonly step: Step;
	readonly validRound?: number;
	readonly lockedRound?: number;
}

export interface IRoundStateRepository {
	getRoundState(height: number, round: number): IRoundState;
}

export interface IConsensusService {
	run(): Promise<void>;
	getHeight(): number;
	getRound(): number;
	getStep(): Step;
	getState(): IConsensusState;
	handle(roundState: IRoundState): Promise<void>;
	handleCommittedBlockState(committedBlockState: IProcessableUnit): Promise<void>;
	onTimeoutStartRound(): Promise<void>;
	onTimeoutPropose(height: number, round: number): Promise<void>;
	onTimeoutPrevote(height: number, round: number): Promise<void>;
	onTimeoutPrecommit(height: number, round: number): Promise<void>;
}

export interface IConsensusState extends IConsensusStateData {
	readonly lockedValue?: IRoundState;
	readonly validValue?: IRoundState;
}

export interface IConsensusStorage {
	getState(): Promise<IConsensusStateData | undefined>;
	saveState(state: IConsensusState): Promise<void>;
	saveProposal(state: IProposal): Promise<void>;
	savePrevote(state: IPrevote): Promise<void>;
	savePrecommit(state: IPrecommit): Promise<void>;
	getProposals(): Promise<IProposal[]>;
	getPrevotes(): Promise<IPrevote[]>;
	getPrecommits(): Promise<IPrecommit[]>;
	clear(): Promise<void>;
}

export interface IBootstrapper {
	run(): Promise<IConsensusState | undefined>;
}

export interface IHandler {
	onProposal(proposal: IProposal): Promise<void>;
	onPrevote(prevote: IPrevote): Promise<void>;
	onPrecommit(precommit: IPrecommit): Promise<void>;
	onCommittedBlock(committedBlock: ICommittedBlock): Promise<void>;
}

export interface IScheduler {
	scheduleTimeoutStartRound(): void;
	scheduleTimeoutPropose(height: number, round: number): void;
	scheduleTimeoutPrevote(height: number, round: number): void;
	scheduleTimeoutPrecommit(height: number, round: number): void;
	clear(): void;
}

export interface IProposerPicker {
	handleCommittedBlock(block: IBlockCommit): void;
	getValidatorIndex(round: number): number;
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

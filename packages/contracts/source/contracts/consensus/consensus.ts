import { IProcessableUnit } from "../block-processor";
import { IAggregatedSignature, IBlockCommit, IPrecommit, IPrevote, IProposal } from "../crypto";
import { IValidatorWallet } from "../state";
import { ProcessorResult, Step } from "./enums";

export interface IRoundState extends IProcessableUnit {
	readonly validators: string[];
	readonly proposer: IValidatorWallet;
	getProposal(): IProposal | undefined;
	hasProposal(): boolean;
	hasPrevote(validatorIndex: number): boolean;
	hasPrecommit(validatorIndex: number): boolean;
	addProposal(proposal: IProposal): void;
	addPrevote(prevote: IPrevote): void;
	addPrecommit(precommit: IPrecommit): void;
	hasMajorityPrevotes(): boolean;
	hasMajorityPrevotesAny(): boolean;
	hasMajorityPrevotesNull(): boolean;
	hasMajorityPrecommits(): boolean;
	hasMajorityPrecommitsAny(): boolean;
	hasMinorityPrevotesOrPrecommits(): boolean;
	getPrevote(validatorIndex: number): IPrevote | undefined;
	getPrecommit(validatorIndex: number): IPrecommit | undefined;
	getValidator(consensusPublicKey: string): IValidatorWallet;
	getValidatorPrevoteSignatures(): Map<string, { signature: string }>;
	getValidatorPrecommitSignatures(): Map<string, { signature: string }>;
	getValidatorsSignedPrevote(): boolean[];
	getValidatorsSignedPrecommit(): boolean[];
	aggregatePrevotes(): Promise<IAggregatedSignature>;
	aggregatePrecommits(): Promise<IAggregatedSignature>;
	logPrevotes(): void;
	logPrecommits(): void;
}

export interface IAggregator {
	aggregateMajorityPrevotes(roundState: IRoundState): Promise<IAggregatedSignature>;
	aggregateMajorityPrecommits(roundState: IRoundState): Promise<IAggregatedSignature>;
	aggregate(signatures: Map<number, { signature: string }>): Promise<IAggregatedSignature>;
}

export interface IVerifier {
	hasValidProposalLockProof(roundState: IRoundState): Promise<boolean>;
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
	clear(): void;
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

export interface IProcessor {
	process(data: Buffer, broadcast?: boolean): Promise<ProcessorResult>;
}

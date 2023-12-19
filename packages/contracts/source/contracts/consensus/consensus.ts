import { AggregatedSignature, Precommit, Prevote, Proposal } from "../crypto";
import { CommittedBlock } from "../crypto/commit";
import { ProcessableUnit } from "../processor";
import { ValidatorWallet } from "../state";
import { Step } from "./enums";

export interface RoundState extends ProcessableUnit {
	readonly validators: string[];
	readonly proposer: ValidatorWallet;
	getProposal(): Proposal | undefined;
	hasProposal(): boolean;
	hasPrevote(validatorIndex: number): boolean;
	hasPrecommit(validatorIndex: number): boolean;
	addProposal(proposal: Proposal): void;
	addPrevote(prevote: Prevote): void;
	addPrecommit(precommit: Precommit): void;
	hasMajorityPrevotes(): boolean;
	hasMajorityPrevotesAny(): boolean;
	hasMajorityPrevotesNull(): boolean;
	hasMajorityPrecommits(): boolean;
	hasMajorityPrecommitsAny(): boolean;
	hasMinorityPrevotesOrPrecommits(): boolean;
	getPrevote(validatorIndex: number): Prevote | undefined;
	getPrecommit(validatorIndex: number): Precommit | undefined;
	getPrevotes(): Prevote[];
	getPrecommits(): Precommit[];
	getValidator(consensusPublicKey: string): ValidatorWallet;
	getValidatorsSignedPrevote(): readonly boolean[];
	getValidatorsSignedPrecommit(): readonly boolean[];
	aggregatePrevotes(): Promise<AggregatedSignature>;
	aggregatePrecommits(): Promise<AggregatedSignature>;
	logPrevotes(): void;
	logPrecommits(): void;
}

export type CommittedBlockStateFactory = (committedBlock: CommittedBlock) => ProcessableUnit;

export interface Aggregator {
	aggregate(signatures: Map<number, { signature: string }>, activeValidators: number): Promise<AggregatedSignature>;
	verify(signature: AggregatedSignature, data: Buffer, activeValidators: number): Promise<boolean>;
}

export interface Verifier {
	hasValidProposalLockProof(roundState: RoundState): Promise<boolean>;
}

export interface ConsensusStateData {
	readonly height: number;
	readonly round: number;
	readonly step: Step;
	readonly validRound?: number;
	readonly lockedRound?: number;
}

export interface RoundStateRepository {
	getRoundState(height: number, round: number): RoundState;
	getRoundStates(): RoundState[];
	clear(): void;
}

export interface ConsensusService {
	run(): Promise<void>;
	getHeight(): number;
	getRound(): number;
	getStep(): Step;
	getState(): ConsensusState;
	handle(roundState: RoundState): Promise<void>;
	handleCommittedBlockState(committedBlockState: ProcessableUnit): Promise<void>;
	onTimeoutStartRound(): Promise<void>;
	onTimeoutPropose(height: number, round: number): Promise<void>;
	onTimeoutPrevote(height: number, round: number): Promise<void>;
	onTimeoutPrecommit(height: number, round: number): Promise<void>;
	dispose(): Promise<void>;
}

export interface ConsensusState extends ConsensusStateData {
	readonly lockedValue?: RoundState;
	readonly validValue?: RoundState;
}

export interface ConsensusStorage {
	getState(): Promise<ConsensusStateData | undefined>;
	saveState(state: ConsensusState): Promise<void>;
	saveProposals(proposal: Proposal[]): Promise<void>;
	savePrevotes(prevotes: Prevote[]): Promise<void>;
	savePrecommits(precommits: Precommit[]): Promise<void>;
	getProposals(): Promise<Proposal[]>;
	getPrevotes(): Promise<Prevote[]>;
	getPrecommits(): Promise<Precommit[]>;
	clear(): Promise<void>;
}

export interface Bootstrapper {
	run(): Promise<ConsensusState | undefined>;
}

export interface Scheduler {
	scheduleTimeoutStartRound(): void;
	scheduleTimeoutPropose(height: number, round: number): void;
	scheduleTimeoutPrevote(height: number, round: number): void;
	scheduleTimeoutPrecommit(height: number, round: number): void;
	clear(): void;
}

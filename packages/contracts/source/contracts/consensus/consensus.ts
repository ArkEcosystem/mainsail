import { AggregatedSignature, Commit, Precommit, Prevote, Proposal } from "../crypto/index.js";
import { ProcessableUnit } from "../processor.js";
import { ValidatorWallet } from "../state/index.js";
import { Step } from "./enums.js";

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

export type CommitStateFactory = (commit: Commit) => ProcessableUnit;

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
	handleCommitState(commitState: ProcessableUnit): Promise<void>;
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

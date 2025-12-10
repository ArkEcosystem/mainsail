import type { AggregatedSignature, Commit, Message, Proposal } from "../crypto/index.js";
import type { ProcessableUnit } from "../processor/index.js";
import type { ValidatorWallet } from "../state/index.js";
import type { Step } from "./enums.js";

export interface RoundState extends ProcessableUnit {
	readonly validators: string[];
	readonly proposer: ValidatorWallet;
	getProposal(): Proposal | undefined;
	hasProposal(): boolean;
	hasPrevote(validatorIndex: number): boolean;
	hasPrecommit(validatorIndex: number): boolean;
	addProposal(proposal: Proposal): void;
	addPrevote(prevote: Message): void;
	addPrecommit(precommit: Message): void;
	hasMajorityPrevotes(): boolean;
	hasMajorityPrevotesAny(): boolean;
	hasMajorityPrevotesNull(): boolean;
	hasMajorityPrecommits(): boolean;
	hasMajorityPrecommitsAny(): boolean;
	hasMinorityPrevotesOrPrecommits(): boolean;
	getPrevote(validatorIndex: number): Message | undefined;
	getPrecommit(validatorIndex: number): Message | undefined;
	getPrevotes(): Message[];
	getPrecommits(): Message[];
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
	aggregate(signatures: Map<number, { signature: string }>, roundValidators: number): Promise<AggregatedSignature>;
	verify(signature: AggregatedSignature, data: Buffer, roundValidators: number): Promise<boolean>;
}

export interface Verifier {
	hasValidProposalLockProof(roundState: RoundState): Promise<boolean>;
}

export interface StateData {
	readonly blockNumber: number;
	readonly round: number;
	readonly step: Step;
	readonly validRound?: number;
	readonly lockedRound?: number;
}

export interface RoundStateRepository {
	getRoundState(blockNumber: number, round: number): RoundState;
	getRoundStates(): RoundState[];
	clear(): void;
}

export interface Service {
	run(): Promise<void>;
	getBlockNumber(): number;
	getRound(): number;
	getStep(): Step;
	getState(): State;
	handle(roundState: RoundState): Promise<void>;
	handleCommitState(commitState: ProcessableUnit): Promise<void>;
	onTimeoutStartRound(): Promise<void>;
	onTimeoutPropose(blockNumber: number, round: number): Promise<void>;
	onTimeoutPrevote(blockNumber: number, round: number): Promise<void>;
	onTimeoutPrecommit(blockNumber: number, round: number): Promise<void>;
	dispose(): Promise<void>;
}

export interface State extends StateData {
	readonly lockedValue?: RoundState;
	readonly validValue?: RoundState;
}

export interface Bootstrapper {
	run(): Promise<State | undefined>;
}

export interface Scheduler {
	getNextBlockTimestamp(commitTime: number): number;
	scheduleTimeoutBlockPrepare(timestamp: number): boolean;
	scheduleTimeoutPropose(blockNumber: number, round: number): boolean;
	scheduleTimeoutPrevote(blockNumber: number, round: number): boolean;
	scheduleTimeoutPrecommit(blockNumber: number, round: number): boolean;
	clear(): void;
}

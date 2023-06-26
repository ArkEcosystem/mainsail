import { IProcessableUnit } from "./block-processor";
import { IBlock, IKeyPair, IPrecommit, IPrevote, IProposal, IProposalLockProof, IValidatorSetMajority } from "./crypto";

export interface IRoundState extends IProcessableUnit {
	readonly validators: string[];
	readonly proposer: string;
	getProposal(): IProposal | undefined;
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

export interface IRoundStateRepository {
	getRoundState(height: number, round: number): Promise<IRoundState>;
}

export interface IConsensusService {
	run(): Promise<void>;
	getHeight(): number;
	getRound(): number;
	getStep(): Step;
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

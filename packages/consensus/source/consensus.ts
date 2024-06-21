import { inject, injectable } from "@mainsail/container";
import { Contracts, Events, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import dayjs from "dayjs";

@injectable()
export class Consensus implements Contracts.Consensus.Service {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Consensus.Bootstrapper)
	private readonly bootstrapper!: Contracts.Consensus.Bootstrapper;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Processor.BlockProcessor)
	private readonly processor!: Contracts.Processor.BlockProcessor;

	@inject(Identifiers.State.Service)
	private readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.Consensus.Processor.Proposal)
	private readonly proposalProcessor!: Contracts.Consensus.ProposalProcessor;

	@inject(Identifiers.Consensus.Processor.PreVote)
	private readonly prevoteProcessor!: Contracts.Consensus.PrevoteProcessor;

	@inject(Identifiers.Consensus.Processor.PreCommit)
	private readonly precommitProcessor!: Contracts.Consensus.PrecommitProcessor;

	@inject(Identifiers.Consensus.Scheduler)
	private readonly scheduler!: Contracts.Consensus.Scheduler;

	@inject(Identifiers.Validator.Repository)
	private readonly validatorsRepository!: Contracts.Validator.ValidatorRepository;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepository!: Contracts.Consensus.RoundStateRepository;

	@inject(Identifiers.Consensus.CommitLock)
	private readonly commitLock!: Contracts.Kernel.Lock;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly eventDispatcher!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	#height = 1;
	#round = 0;
	#step: Contracts.Consensus.Step = Contracts.Consensus.Step.Propose;
	#lockedValue?: Contracts.Consensus.RoundState;
	#validValue?: Contracts.Consensus.RoundState;

	#didMajorityPrevote = false;
	#didMajorityPrecommit = false;
	#isDisposed = false;
	#pendingJobs = new Set<Contracts.Consensus.RoundState>();

	#proposalPromise?: Promise<Contracts.Crypto.Proposal>;
	#roundStartTime = 0;

	// Handler lock is different than commit lock. It is used to prevent parallel processing and it is similar to queue.
	readonly #handlerLock = new Utils.Lock();

	public getHeight(): number {
		return this.#height;
	}

	public getRound(): number {
		return this.#round;
	}

	// TODO: Only for tests
	public setRound(round: number): void {
		this.#round = round;
	}

	public getStep(): Contracts.Consensus.Step {
		return this.#step;
	}

	// TODO: Only for tests
	public setStep(step: Contracts.Consensus.Step): void {
		this.#step = step;
	}

	public getLockedRound(): number | undefined {
		return this.#lockedValue ? this.#lockedValue.round : undefined;
	}

	public getValidRound(): number | undefined {
		return this.#validValue ? this.#validValue.round : undefined;
	}

	// TODO: Only for tests
	public setValidRound(round: Contracts.Consensus.RoundState): void {
		this.#validValue = round;
	}

	// TODO: Only for tests
	public setProposal(proposalPromise: Promise<Contracts.Crypto.Proposal>): void {
		this.#proposalPromise = proposalPromise;
	}

	public getState(): Contracts.Consensus.State {
		return {
			height: this.#height,
			lockedRound: this.getLockedRound(),
			round: this.#round,
			step: this.#step,
			validRound: this.getValidRound(),
		};
	}

	public async run(): Promise<void> {
		await this.#bootstrap();
		await this.startRound(this.#round);

		await this.handle(this.roundStateRepository.getRoundState(this.#height, this.#round));

		// Rerun previous rounds, in case proposal & +2/3 precommits were received
		for (let index = 0; index < this.#round; index++) {
			await this.handle(this.roundStateRepository.getRoundState(this.#height, index));
		}
	}

	public async dispose(): Promise<void> {
		this.scheduler.clear();
		this.#isDisposed = true;
		await this.#handlerLock.runExclusive(async () => {});
	}

	async handle(roundState: Contracts.Consensus.RoundState): Promise<void> {
		if (this.#pendingJobs.has(roundState)) {
			return;
		}
		this.#pendingJobs.add(roundState);

		await this.#handlerLock.runExclusive(async () => {
			this.#pendingJobs.delete(roundState);

			if (this.#isDisposed) {
				return;
			}

			await this.#processProposal(roundState);

			await this.onProposal(roundState);
			await this.onProposalLocked(roundState);

			if (roundState.hasMajorityPrevotes()) {
				await this.onMajorityPrevote(roundState);
			}

			if (roundState.hasMajorityPrevotesAny()) {
				await this.onMajorityPrevoteAny(roundState);
			}

			if (roundState.hasMajorityPrevotesNull()) {
				await this.onMajorityPrevoteNull(roundState);
			}

			if (roundState.hasMajorityPrecommitsAny()) {
				await this.onMajorityPrecommitAny(roundState);
			}

			if (roundState.hasMajorityPrecommits()) {
				await this.onMajorityPrecommit(roundState);
			}

			if (roundState.hasMinorityPrevotesOrPrecommits()) {
				await this.onMinorityWithHigherRound(roundState);
			}
		});
	}

	async handleCommitState(commitState: Contracts.Processor.ProcessableUnit): Promise<void> {
		await this.#handlerLock.runExclusive(async () => {
			if (this.#isDisposed) {
				return;
			}

			await this.onMajorityPrecommit(commitState);
		});
	}

	public async startRound(round: number): Promise<void> {
		this.#round = round;
		this.#step = Contracts.Consensus.Step.Propose;
		this.#didMajorityPrevote = false;
		this.#didMajorityPrecommit = false;
		this.#roundStartTime = dayjs().valueOf();

		this.scheduler.clear();

		if (this.#isDisposed) {
			return;
		}

		const roundState = this.roundStateRepository.getRoundState(this.#height, this.#round);
		this.logger.info(`>> Starting new round: ${this.#height}/${this.#round} with proposer: ${roundState.proposer}`);

		await this.eventDispatcher.dispatch(Events.ConsensusEvent.RoundStarted, this.getState());

		this.scheduler.scheduleTimeoutBlockPrepare(this.scheduler.getNextBlockTimestamp(this.#roundStartTime));

		// TODO: Skip on sync
		await this.propose(roundState);
	}

	public async onTimeoutStartRound(): Promise<void> {
		this.scheduler.scheduleTimeoutPropose(this.#height, this.#round);

		if (this.#proposalPromise) {
			const proposal = await this.#proposalPromise;
			this.#proposalPromise = undefined;
			await this.proposalProcessor.process(proposal);
		}
	}

	protected async onProposal(roundState: Contracts.Consensus.RoundState): Promise<void> {
		const proposal = roundState.getProposal();

		if (
			this.#step !== Contracts.Consensus.Step.Propose ||
			this.#isInvalidRoundState(roundState) ||
			!proposal ||
			proposal.validRound !== undefined
		) {
			return;
		}

		this.#step = Contracts.Consensus.Step.Prevote;

		const { block } = proposal.getData();
		this.logger.info(`Received proposal ${this.#height}/${this.#round} blockId: ${block.data.id}`);
		await this.eventDispatcher.dispatch(Events.ConsensusEvent.ProposalAccepted, this.getState());

		await this.prevote(roundState.getProcessorResult() ? block.data.id : undefined);
	}

	protected async onProposalLocked(roundState: Contracts.Consensus.RoundState): Promise<void> {
		const proposal = roundState.getProposal();
		if (
			this.#step !== Contracts.Consensus.Step.Propose ||
			this.#isInvalidRoundState(roundState) ||
			!proposal ||
			!proposal.getData().lockProof ||
			proposal.validRound === undefined ||
			proposal.validRound >= this.#round
		) {
			return;
		}

		const { block } = proposal.getData();
		this.#step = Contracts.Consensus.Step.Prevote;

		this.logger.info(`Received proposal ${this.#height}/${this.#round} with locked blockId: ${block.data.id}`);
		await this.eventDispatcher.dispatch(Events.ConsensusEvent.ProposalAccepted, this.getState());

		const lockedRound = this.getLockedRound();

		if ((!lockedRound || lockedRound <= proposal.validRound) && roundState.getProcessorResult()) {
			await this.prevote(block.data.id);
		} else {
			await this.prevote();
		}
	}

	protected async onMajorityPrevote(roundState: Contracts.Consensus.RoundState): Promise<void> {
		const proposal = roundState.getProposal();

		if (
			this.#didMajorityPrevote ||
			this.#step === Contracts.Consensus.Step.Propose ||
			this.#isInvalidRoundState(roundState) ||
			!proposal ||
			!roundState.getProcessorResult()
		) {
			return;
		}

		const { block } = proposal.getData();

		this.logger.info(`Received +2/3 prevotes for ${this.#height}/${this.#round} blockId: ${block.data.id}`);

		this.#didMajorityPrevote = true;

		if (this.#step === Contracts.Consensus.Step.Prevote) {
			this.#lockedValue = roundState;
			this.#validValue = roundState;
			this.#step = Contracts.Consensus.Step.Precommit;

			await this.eventDispatcher.dispatch(Events.ConsensusEvent.PrevotedProposal, this.getState());
			await this.precommit(block.data.id);
		} else {
			this.#validValue = roundState;

			await this.eventDispatcher.dispatch(Events.ConsensusEvent.PrevotedProposal, this.getState());
		}
	}

	protected async onMajorityPrevoteAny(roundState: Contracts.Consensus.RoundState): Promise<void> {
		if (this.#step !== Contracts.Consensus.Step.Prevote || this.#isInvalidRoundState(roundState)) {
			return;
		}

		if (this.scheduler.scheduleTimeoutPrevote(this.#height, this.#round)) {
			await this.eventDispatcher.dispatch(Events.ConsensusEvent.PrevotedAny, this.getState());
		}
	}

	protected async onMajorityPrevoteNull(roundState: Contracts.Consensus.RoundState): Promise<void> {
		if (this.#step !== Contracts.Consensus.Step.Prevote || this.#isInvalidRoundState(roundState)) {
			return;
		}

		this.logger.info(`Received +2/3 prevotes for ${this.#height}/${this.#round} blockId: null`);

		this.#step = Contracts.Consensus.Step.Precommit;

		await this.eventDispatcher.dispatch(Events.ConsensusEvent.PrevotedNull, this.getState());
		await this.precommit();
	}

	protected async onMajorityPrecommitAny(roundState: Contracts.Consensus.RoundState): Promise<void> {
		if (this.#isInvalidRoundState(roundState)) {
			return;
		}

		if (this.scheduler.scheduleTimeoutPrecommit(this.#height, this.#round)) {
			await this.eventDispatcher.dispatch(Events.ConsensusEvent.PrecommitedAny, this.getState());
		}
	}

	protected async onMajorityPrecommit(roundState: Contracts.Processor.ProcessableUnit): Promise<void> {
		// TODO: Only height must match. Round can be any. Add tests
		if (this.#didMajorityPrecommit || roundState.height !== this.#height) {
			return;
		}

		this.#didMajorityPrecommit = true;
		const block = roundState.getBlock();

		if (!roundState.getProcessorResult()) {
			this.logger.info(
				`Block ${block.data.id} on height ${this.#height} received +2/3 precommits but is invalid`,
			);
			return;
		}

		this.logger.info(`Received +2/3 precommits for ${this.#height}/${roundState.round} blockId: ${block.data.id}`);
		await this.eventDispatcher.dispatch(Events.ConsensusEvent.PrecommitedProposal, this.getState());

		await this.commitLock.runExclusive(async () => {
			try {
				await this.processor.commit(roundState);
			} catch (error) {
				await this.app.terminate("Failed to commit block", error);
			}

			this.roundStateRepository.clear();

			this.#height++;
			this.#lockedValue = undefined;
			this.#validValue = undefined;

			await this.startRound(0);
		});
	}

	protected async onMinorityWithHigherRound(roundState: Contracts.Processor.ProcessableUnit): Promise<void> {
		if (roundState.height !== this.#height || roundState.round <= this.#round) {
			return;
		}

		await this.startRound(roundState.round);
	}

	public async onTimeoutPropose(height: number, round: number): Promise<void> {
		await this.#handlerLock.runExclusive(async () => {
			if (this.#step !== Contracts.Consensus.Step.Propose || this.#height !== height || this.#round !== round) {
				return;
			}

			this.logger.info(`Timeout to propose ${this.#height}/${this.#round} expired`);

			this.#step = Contracts.Consensus.Step.Prevote;
			await this.prevote();
		});
	}

	public async onTimeoutPrevote(height: number, round: number): Promise<void> {
		await this.#handlerLock.runExclusive(async () => {
			if (this.#step !== Contracts.Consensus.Step.Prevote || this.#height !== height || this.#round !== round) {
				return;
			}

			this.logger.info(`Timeout to prevote ${this.#height}/${this.#round} expired`);
			this.roundStateRepository.getRoundState(this.#height, this.#round).logPrevotes();

			this.#step = Contracts.Consensus.Step.Precommit;
			await this.precommit();
		});
	}

	public async onTimeoutPrecommit(height: number, round: number): Promise<void> {
		await this.#handlerLock.runExclusive(async () => {
			if (this.#height !== height || this.#round !== round) {
				return;
			}

			this.logger.info(`Timeout to precommit ${this.#height}/${this.#round} expired`);
			this.roundStateRepository.getRoundState(this.#height, this.#round).logPrevotes();
			this.roundStateRepository.getRoundState(this.#height, this.#round).logPrecommits();

			await this.startRound(this.#round + 1);
		});
	}

	#isInvalidRoundState(roundState: Contracts.Processor.ProcessableUnit): boolean {
		if (roundState.height !== this.#height) {
			return true;
		}

		if (roundState.round !== this.#round) {
			return true;
		}

		return false;
	}

	public async propose(roundState: Contracts.Consensus.RoundState): Promise<void> {
		if (roundState.hasProposal()) {
			return;
		}

		const registeredProposer = this.validatorsRepository.getValidator(roundState.proposer.getConsensusPublicKey());

		if (registeredProposer === undefined) {
			return;
		}

		this.logger.info(`Found registered proposer: ${roundState.proposer}`);

		this.#proposalPromise = this.#makeProposal(roundState, registeredProposer);
	}

	async #makeProposal(
		roundState: Contracts.Consensus.RoundState,
		registeredProposer: Contracts.Validator.Validator,
	): Promise<Contracts.Crypto.Proposal> {
		if (this.#validValue) {
			const block = this.#validValue.getBlock();
			const lockProof = await this.#validValue.aggregatePrevotes();

			this.logger.info(
				`Proposing valid block ${this.#height}/${
					this.#round
				} from round ${this.getValidRound()} with blockId: ${block.data.id}`,
			);

			return await registeredProposer.propose(
				this.validatorSet.getValidatorIndexByWalletPublicKey(roundState.proposer.getWalletPublicKey()),
				this.#round,
				this.#validValue.round,
				block,
				lockProof,
			);
		}

		const block = await registeredProposer.prepareBlock(
			roundState.proposer.getWalletPublicKey(),
			this.#round,
			this.scheduler.getNextBlockTimestamp(this.#roundStartTime),
		);
		this.logger.info(`Proposing new block ${this.#height}/${this.#round} with blockId: ${block.data.id}`);

		void this.eventDispatcher.dispatch(Events.BlockEvent.Forged, block.data);

		return registeredProposer.propose(
			this.validatorSet.getValidatorIndexByWalletPublicKey(roundState.proposer.getWalletPublicKey()),
			this.#round,
			undefined,
			block,
		);
	}

	public async prevote(value?: string): Promise<void> {
		const roundState = this.roundStateRepository.getRoundState(this.#height, this.#round);
		for (const validator of this.validatorSet.getActiveValidators()) {
			const localValidator = this.validatorsRepository.getValidator(validator.getConsensusPublicKey());
			if (localValidator === undefined) {
				continue;
			}

			const validatorIndex = this.validatorSet.getValidatorIndexByWalletPublicKey(validator.getWalletPublicKey());
			if (roundState.hasPrevote(validatorIndex)) {
				continue;
			}

			const prevote = await localValidator.prevote(validatorIndex, this.#height, this.#round, value);

			void this.prevoteProcessor.process(prevote);
		}
	}

	public async precommit(value?: string): Promise<void> {
		const roundState = this.roundStateRepository.getRoundState(this.#height, this.#round);
		for (const validator of this.validatorSet.getActiveValidators()) {
			const localValidator = this.validatorsRepository.getValidator(validator.getConsensusPublicKey());
			if (localValidator === undefined) {
				continue;
			}

			const validatorIndex = this.validatorSet.getValidatorIndexByWalletPublicKey(validator.getWalletPublicKey());
			if (roundState.hasPrecommit(validatorIndex)) {
				continue;
			}

			const precommit = await localValidator.precommit(validatorIndex, this.#height, this.#round, value);

			void this.precommitProcessor.process(precommit);
		}
	}

	async #bootstrap(): Promise<void> {
		const state = await this.bootstrapper.run();
		const store = this.stateService.getStore();

		if (state && state.height === store.getLastBlock().data.height + 1) {
			this.#step = state.step;
			this.#height = state.height;
			this.#round = state.round;
			this.#lockedValue = state.lockedValue;
			this.#validValue = state.validValue;
		} else {
			if (state) {
				this.logger.warning(
					`Skipping state restore, because stored height is ${state.height}, but should be ${
						store.getLastBlock().data.height + 1
					}`,
				);

				this.roundStateRepository.clear();
			}

			const lastBlock = store.getLastBlock();
			this.#height = lastBlock.data.height + 1;
		}

		if (this.#height !== this.configuration.getHeight()) {
			throw new Error(
				`bootstrapped height ${
					this.#height
				} does not match configuration height ${this.configuration.getHeight()}`,
			);
		}

		this.logger.info(`Completed consensus bootstrap for ${this.#height}/${this.#round}/${store.getTotalRound()}`);

		await this.eventDispatcher.dispatch(Events.ConsensusEvent.Bootstrapped, this.getState());
	}

	async #processProposal(roundState: Contracts.Consensus.RoundState): Promise<void> {
		const proposal = roundState.getProposal();
		if (!roundState.hasProcessorResult() && proposal) {
			try {
				await proposal.deserializeData();

				if (!(await this.proposalProcessor.hasValidLockProof(proposal))) {
					roundState.setProcessorResult(false);
					return;
				}

				roundState.setProcessorResult(await this.processor.process(roundState));
			} catch {
				roundState.setProcessorResult(false);
			}
		}
	}
}

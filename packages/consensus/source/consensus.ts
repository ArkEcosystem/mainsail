import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class Consensus implements Contracts.Consensus.IConsensusService {
	@inject(Identifiers.Consensus.Bootstrapper)
	private readonly bootstrapper!: Contracts.Consensus.IBootstrapper;

	@inject(Identifiers.BlockProcessor)
	private readonly processor!: Contracts.BlockProcessor.Processor;

	@inject(Identifiers.StateStore)
	private readonly state!: Contracts.State.StateStore;

	@inject(Identifiers.Consensus.ProposalProcessor)
	private readonly proposalProcessor!: Contracts.Consensus.IProcessor;

	@inject(Identifiers.Consensus.PrevoteProcessor)
	private readonly prevoteProcessor!: Contracts.Consensus.IProcessor;

	@inject(Identifiers.Consensus.PrecommitProcessor)
	private readonly precommitProcessor!: Contracts.Consensus.IProcessor;

	@inject(Identifiers.Consensus.Scheduler)
	private readonly scheduler!: Contracts.Consensus.IScheduler;

	// TODO: Rename identifier
	@inject(Identifiers.Consensus.ValidatorRepository)
	private readonly validatorsRepository!: Contracts.Validator.IValidatorRepository;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepository!: Contracts.Consensus.IRoundStateRepository;

	@inject(Identifiers.Consensus.Storage)
	private readonly storage!: Contracts.Consensus.IConsensusStorage;

	@inject(Identifiers.Consensus.CommitLock)
	private readonly commitLock!: Contracts.Kernel.ILock;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	#height = 2;
	#round = 0;
	#step: Contracts.Consensus.Step = Contracts.Consensus.Step.Propose;
	#lockedValue?: Contracts.Consensus.IRoundState;
	#validValue?: Contracts.Consensus.IRoundState;

	#didMajorityPrevote = false;
	#didMajorityPrecommit = false;

	readonly #lock = new Utils.Lock();

	public getHeight(): number {
		return this.#height;
	}

	public getRound(): number {
		return this.#round;
	}

	// TODO: Only for testing
	public setRound(round: number): void {
		this.#round = round;
	}

	public getStep(): Contracts.Consensus.Step {
		return this.#step;
	}

	// TODO: Only for testing
	public setStep(step: Contracts.Consensus.Step): void {
		this.#step = step;
	}

	public getLockedRound(): number | undefined {
		return this.#lockedValue ? this.#lockedValue.round : undefined;
	}

	public getValidRound(): number | undefined {
		return this.#validValue ? this.#validValue.round : undefined;
	}

	// TODO: Only for testing
	public setValidRound(round: Contracts.Consensus.IRoundState): void {
		this.#validValue = round;
	}

	public getState(): Contracts.Consensus.IConsensusState {
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

	async handle(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		await this.#lock.runExclusive(async () => {
			if (!roundState.hasProcessorResult() && roundState.hasProposal()) {
				const result = await this.processor.process(roundState);
				roundState.setProcessorResult(result);
			}

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

	// TODO: Check if can be joined with handle
	async handleCommittedBlockState(committedBlockState: Contracts.BlockProcessor.IProcessableUnit): Promise<void> {
		await this.#lock.runExclusive(async () => {
			await this.onMajorityPrecommit(committedBlockState);
		});
	}

	public async startRound(round: number): Promise<void> {
		this.#round = round;
		this.#step = Contracts.Consensus.Step.Propose;
		this.#didMajorityPrevote = false;
		this.#didMajorityPrecommit = false;

		this.scheduler.clear();

		await this.#saveState();

		this.scheduler.scheduleTimeoutStartRound();
	}

	public async onTimeoutStartRound(): Promise<void> {
		const roundState = this.roundStateRepository.getRoundState(this.#height, this.#round);

		this.logger.info(
			`>> Starting new round: ${this.#height}/${this.#round} with proposer: ${roundState.proposer.getUsername()}`,
		);

		const proposer = this.validatorsRepository.getValidator(roundState.proposer.getConsensusPublicKey());
		if (proposer) {
			this.logger.info(`Found registered proposer: ${roundState.proposer.getUsername()}`);

			// TODO: Error handling
			await this.#propose(proposer);
		} else {
			// TODO: Can we call this even even proposer is known?
			this.scheduler.scheduleTimeoutPropose(this.#height, this.#round);
		}
	}

	protected async onProposal(roundState: Contracts.Consensus.IRoundState): Promise<void> {
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

		const { block } = proposal.block;
		this.logger.info(`Received proposal ${this.#height}/${this.#round} blockId: ${block.data.id}`);

		await this.#prevote(roundState.getProcessorResult() ? block.data.id : undefined);
	}

	protected async onProposalLocked(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		const proposal = roundState.getProposal();
		if (
			this.#step !== Contracts.Consensus.Step.Propose ||
			this.#isInvalidRoundState(roundState) ||
			!proposal ||
			!proposal.block.lockProof ||
			proposal.validRound === undefined ||
			proposal.validRound >= this.#round
		) {
			return;
		}

		const { block } = proposal.block;

		this.logger.info(`Received proposal ${this.#height}/${this.#round} with locked blockId: ${block.data.id}`);

		this.#step = Contracts.Consensus.Step.Prevote;

		const lockedRound = this.getLockedRound();

		if ((!lockedRound || lockedRound <= proposal.validRound) && roundState.getProcessorResult()) {
			await this.#prevote(block.data.id);
		} else {
			await this.#prevote();
		}
	}

	protected async onMajorityPrevote(roundState: Contracts.Consensus.IRoundState): Promise<void> {
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

		const { block } = proposal.block;

		this.logger.info(`Received +2/3 prevotes for ${this.#height}/${this.#round} blockId: ${block.data.id}`);

		this.#didMajorityPrevote = true;

		if (this.#step === Contracts.Consensus.Step.Prevote) {
			this.#lockedValue = roundState;
			this.#validValue = roundState;
			this.#step = Contracts.Consensus.Step.Precommit;

			await this.#precommit(block.data.id);
		} else {
			this.#validValue = roundState;

			await this.#saveState();
		}
	}

	protected async onMajorityPrevoteAny(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		if (this.#step !== Contracts.Consensus.Step.Prevote || this.#isInvalidRoundState(roundState)) {
			return;
		}

		this.scheduler.scheduleTimeoutPrevote(this.#height, this.#round);
	}

	protected async onMajorityPrevoteNull(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		if (this.#step !== Contracts.Consensus.Step.Prevote || this.#isInvalidRoundState(roundState)) {
			return;
		}

		this.logger.info(`Received +2/3 prevotes for ${this.#height}/${this.#round} blockId: null`);

		this.#step = Contracts.Consensus.Step.Precommit;

		await this.#precommit();
	}

	protected async onMajorityPrecommitAny(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		if (this.#isInvalidRoundState(roundState)) {
			return;
		}

		this.scheduler.scheduleTimeoutPrecommit(this.#height, this.#round);
	}

	protected async onMajorityPrecommit(roundState: Contracts.BlockProcessor.IProcessableUnit): Promise<void> {
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

		await this.commitLock.runExclusive(async () => {
			await this.processor.commit(roundState);

			this.#height++;
			this.#lockedValue = undefined;
			this.#validValue = undefined;

			this.roundStateRepository.clear();
			await this.storage.clear();

			await this.startRound(0);
		});
	}

	protected async onMinorityWithHigherRound(roundState: Contracts.BlockProcessor.IProcessableUnit): Promise<void> {
		if (roundState.height !== this.#height || roundState.round <= this.#round) {
			return;
		}

		await this.startRound(roundState.round);
	}

	public async onTimeoutPropose(height: number, round: number): Promise<void> {
		await this.#lock.runExclusive(async () => {
			if (this.#step !== Contracts.Consensus.Step.Propose || this.#height !== height || this.#round !== round) {
				return;
			}

			this.logger.info(`Timeout to propose ${this.#height}/${this.#round} expired`);

			this.#step = Contracts.Consensus.Step.Prevote;
			await this.#prevote();
		});
	}

	public async onTimeoutPrevote(height: number, round: number): Promise<void> {
		await this.#lock.runExclusive(async () => {
			if (this.#step !== Contracts.Consensus.Step.Prevote || this.#height !== height || this.#round !== round) {
				return;
			}

			this.logger.info(`Timeout to prevote ${this.#height}/${this.#round} expired`);
			this.roundStateRepository.getRoundState(this.#height, this.#round).logPrevotes();

			this.#step = Contracts.Consensus.Step.Precommit;
			await this.#precommit();
		});
	}

	public async onTimeoutPrecommit(height: number, round: number): Promise<void> {
		await this.#lock.runExclusive(async () => {
			if (this.#height !== height || this.#round !== round) {
				return;
			}

			this.logger.info(`Timeout to precommit ${this.#height}/${this.#round} expired`);
			this.roundStateRepository.getRoundState(this.#height, this.#round).logPrevotes();
			this.roundStateRepository.getRoundState(this.#height, this.#round).logPrecommits();

			await this.startRound(this.#round + 1);
		});
	}

	#isInvalidRoundState(roundState: Contracts.BlockProcessor.IProcessableUnit): boolean {
		if (roundState.height !== this.#height) {
			return true;
		}

		if (roundState.round !== this.#round) {
			return true;
		}

		return false;
	}

	async #propose(proposer: Contracts.Validator.IValidator): Promise<void> {
		const roundState = this.roundStateRepository.getRoundState(this.#height, this.#round);
		if (roundState.hasProposal()) {
			return;
		}

		let proposal: Contracts.Crypto.IProposal | undefined;

		if (this.#validValue) {
			const block = this.#validValue.getBlock();
			const lockProof = await this.#validValue.aggregatePrevotes();

			this.logger.info(
				`Proposing valid block ${this.#height}/${
					this.#round
				} from round ${this.getValidRound()} with blockId: ${block.data.id}`,
			);

			proposal = await proposer.propose(this.#round, this.#validValue.round, block, lockProof);
		} else {
			const block = await proposer.prepareBlock(this.#height, this.#round);

			this.logger.info(`Proposing new block ${this.#height}/${this.#round} with blockId: ${block.data.id}`);
			proposal = await proposer.propose(this.#round, undefined, block);
		}

		Utils.assert.defined(proposal);
		void this.proposalProcessor.process(proposal.serialized);
	}

	async #prevote(value?: string): Promise<void> {
		const roundState = this.roundStateRepository.getRoundState(this.#height, this.#round);
		for (const validator of this.validatorsRepository.getValidators(this.#getActiveValidators())) {
			if (
				roundState.hasPrevote(
					this.validatorSet.getValidatorIndexByWalletPublicKey(validator.getWalletPublicKey()),
				)
			) {
				continue;
			}

			const prevote = await validator.prevote(this.#height, this.#round, value);

			void this.prevoteProcessor.process(prevote.serialized);
		}

		await this.#saveState();
	}

	async #precommit(value?: string): Promise<void> {
		const roundState = this.roundStateRepository.getRoundState(this.#height, this.#round);
		for (const validator of this.validatorsRepository.getValidators(this.#getActiveValidators())) {
			if (
				roundState.hasPrecommit(
					this.validatorSet.getValidatorIndexByWalletPublicKey(validator.getWalletPublicKey()),
				)
			) {
				continue;
			}

			const precommit = await validator.precommit(this.#height, this.#round, value);

			void this.precommitProcessor.process(precommit.serialized);
		}

		await this.#saveState();
	}

	#getActiveValidators(): string[] {
		const activeValidators = this.validatorSet.getActiveValidators();

		return activeValidators.map((validator) => validator.getConsensusPublicKey());
	}

	async #saveState(): Promise<void> {
		await this.storage.saveState(this.getState());
	}

	async #bootstrap(): Promise<void> {
		// TODO: handle outdated state (e.g. last block height != stored height)

		const state = await this.bootstrapper.run();
		if (state) {
			this.#step = state.step;
			this.#height = state.height;
			this.#round = state.round;
			this.#lockedValue = state.lockedValue;
			this.#validValue = state.validValue;
		} else {
			const lastBlock = this.state.getLastBlock();
			this.#height = lastBlock.data.height + 1;
		}

		this.logger.info(
			`Completed consensus bootstrap for ${this.#height}/${this.#round}/${this.state.getLastCommittedRound()}`,
		);
	}
}

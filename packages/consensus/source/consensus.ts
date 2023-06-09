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

	@inject(Identifiers.Consensus.Handler)
	private readonly handler!: Contracts.Consensus.IHandler;

	@inject(Identifiers.PeerBroadcaster)
	private readonly broadcaster!: Contracts.P2P.Broadcaster;

	@inject(Identifiers.Consensus.Scheduler)
	private readonly scheduler!: Contracts.Consensus.IScheduler;

	// TODO: Rename identifier
	@inject(Identifiers.Consensus.ValidatorRepository)
	private readonly validatorsRepository!: Contracts.Consensus.IValidatorRepository;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepository!: Contracts.Consensus.IRoundStateRepository;

	@inject(Identifiers.Consensus.Storage)
	private readonly storage!: Contracts.Consensus.IConsensusStorage;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	#height = 2;
	#round = 0;
	#step: Contracts.Consensus.Step = Contracts.Consensus.Step.Propose;
	#lockedValue?: Contracts.Consensus.IRoundState;
	#lockedRound?: number = undefined;
	#validValue?: Contracts.Consensus.IRoundState;
	#validRound?: number = undefined;

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

	public getLockedValue(): unknown {
		return this.#lockedValue;
	}

	public getLockedRound(): number | undefined {
		return this.#lockedRound;
	}

	public getValidValue(): unknown {
		return this.#validValue;
	}

	public getValidRound(): number | undefined {
		return this.#validRound;
	}

	public getState(): Contracts.Consensus.IConsensusState {
		return {
			height: this.#height,
			lockedRound: this.#lockedRound,
			round: this.#round,
			step: this.#step,
			validRound: this.#validRound,
		};
	}

	public async run(): Promise<void> {
		await this.#bootstrap();
		await this.startRound(this.#round);

		await this.handle(this.roundStateRepository.getRoundState(this.#height, this.#round));
	}

	async handle(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		await this.#lock.runExclusive(async () => {
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

		if (round === 0) {
			// Remove persisted state, because new heigh is reached
			await this.storage.clear();
		}
		await this.#saveState();

		this.scheduler.scheduleTimeoutStartRound();
	}

	public async onTimeoutStartRound(): Promise<void> {
		const { proposer: proposerPublicKey } = this.roundStateRepository.getRoundState(this.#height, this.#round);
		const proposer = this.validatorsRepository.getValidator(proposerPublicKey);

		this.logger.info(`>> Starting new round: ${this.#height}/${this.#round} with proposer ${proposerPublicKey}`);

		if (proposer) {
			// TODO: Error handling
			await this.#propose(proposer);
		} else {
			this.logger.info(`No registered proposer for ${proposerPublicKey}`);

			// TODO: Can we call this even even proposer is known?
			this.scheduler.scheduleTimeoutPropose(this.#height, this.#round);
		}
	}

	// TODO: Implement proposal for validRound >= 0.
	protected async onProposal(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		const proposal = roundState.getProposal();

		if (
			this.#step !== Contracts.Consensus.Step.Propose ||
			this.#isInvalidRoundState(roundState) ||
			!proposal ||
			proposal.validRound
		) {
			return;
		}

		// TODO: Check proposer
		const { block } = proposal.block;
		this.logger.info(`Received proposal ${this.#height}/${this.#round} blockId: ${block.data.id}`);

		const result = await this.processor.process(roundState);
		roundState.setProcessorResult(result);

		this.#step = Contracts.Consensus.Step.Prevote;

		await this.#prevote(result ? block.data.id : undefined);
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

		if (!(await roundState.hasValidProposalLockProof())) {
			this.logger.info(
				`Lock block ${block.data.id} on height ${this.#height} received +2/3 prevotes but the proof is invalid`,
			);
			return;
		}

		this.#step = Contracts.Consensus.Step.Prevote;
		if (!this.#lockedRound || this.#lockedRound <= proposal.validRound) {
			const result = await this.processor.process(roundState);
			roundState.setProcessorResult(result);

			if (result) {
				await this.#prevote(block.data.id);
				return;
			}
		}

		await this.#prevote();
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
			this.#lockedRound = this.#round;
			this.#validValue = roundState;
			this.#validRound = this.#round;
			this.#step = Contracts.Consensus.Step.Precommit;

			await this.#precommit(block.data.id);
		} else {
			this.#validValue = roundState;
			this.#validRound = this.#round;

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

		// ADD: Log info

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
		// TODO: Check if block can be missing
		const block = roundState.getBlock();

		if (!roundState.getProcessorResult()) {
			this.logger.info(`Block ${block.data.id} on height ${this.#height} received +2/3 precommit but is invalid`);
			return;
		}
		this.logger.info(`Received +2/3 precommits for ${this.#height}/${this.#round} blockId: ${block.data.id}`);

		await this.processor.commit(roundState);

		this.#height++;
		this.#lockedRound = undefined;
		this.#lockedValue = undefined;
		this.#validRound = undefined;
		this.#validValue = undefined;

		await this.startRound(0);
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

			this.#step = Contracts.Consensus.Step.Prevote;
			await this.#prevote();
		});
	}

	public async onTimeoutPrevote(height: number, round: number): Promise<void> {
		await this.#lock.runExclusive(async () => {
			if (this.#step !== Contracts.Consensus.Step.Prevote || this.#height !== height || this.#round !== round) {
				return;
			}

			this.#step = Contracts.Consensus.Step.Precommit;
			await this.#precommit();
		});
	}

	public async onTimeoutPrecommit(height: number, round: number): Promise<void> {
		await this.#lock.runExclusive(async () => {
			if (this.#height !== height || this.#round !== round) {
				return;
			}

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

	async #propose(proposer: Contracts.Consensus.IValidator): Promise<void> {
		const roundState = this.roundStateRepository.getRoundState(this.#height, this.#round);
		if (roundState.hasProposal()) {
			return;
		}

		let block: Contracts.Crypto.IBlock;
		let lockProof: Contracts.Crypto.IProposalLockProof | undefined;

		if (this.#validValue) {
			block = roundState.getBlock();
			lockProof = await this.#validValue.getProposalLockProof();
		} else {
			block = await proposer.prepareBlock(this.#height, this.#round);
		}

		const proposal = await proposer.propose(this.#height, this.#round, block, lockProof, this.#validRound);

		void this.broadcaster.broadcastProposal(proposal);
		void this.handler.onProposal(proposal);
	}

	async #prevote(value?: string): Promise<void> {
		const roundState = this.roundStateRepository.getRoundState(this.#height, this.#round);
		for (const validator of this.validatorsRepository.getValidators(this.#getActiveValidators())) {
			if (roundState.hasPrevote(validator)) {
				continue;
			}

			const prevote = await validator.prevote(this.#height, this.#round, value);

			void this.broadcaster.broadcastPrevote(prevote);
			void this.handler.onPrevote(prevote);
		}

		await this.#saveState();
	}

	async #precommit(value?: string): Promise<void> {
		const roundState = this.roundStateRepository.getRoundState(this.#height, this.#round);
		for (const validator of this.validatorsRepository.getValidators(this.#getActiveValidators())) {
			if (roundState.hasPrecommit(validator)) {
				continue;
			}

			const precommit = await validator.precommit(this.#height, this.#round, value);

			void this.broadcaster.broadcastPrecommit(precommit);
			void this.handler.onPrecommit(precommit);
		}

		await this.#saveState();
	}

	#getActiveValidators(): string[] {
		const activeValidators = this.validatorSet.getActiveValidators();

		return activeValidators.map((wallet) => wallet.getAttribute("validator.consensusPublicKey"));
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
			this.#lockedRound = state.lockedRound;
			this.#lockedValue = state.lockedValue;
			this.#validRound = state.validRound;
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

import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import delay from "delay";

import { Step } from "./enums";
import { RoundStateRepository } from "./round-state-repository";

@injectable()
export class Consensus implements Contracts.Consensus.IConsensusService {
	@inject(Identifiers.BlockProcessor)
	private readonly processor!: Contracts.BlockProcessor.Processor;

	@inject(Identifiers.StateStore)
	private readonly state!: Contracts.State.StateStore;

	@inject(Identifiers.Consensus.Handler)
	private readonly handler!: Contracts.Consensus.IHandler;

	@inject(Identifiers.Consensus.Broadcaster)
	private readonly broadcaster!: Contracts.Consensus.IBroadcaster;

	@inject(Identifiers.Consensus.Scheduler)
	private readonly scheduler!: Contracts.Consensus.IScheduler;

	// TODO: Rename identifier
	@inject(Identifiers.Consensus.ValidatorRepository)
	private readonly validatorsRepository!: Contracts.Consensus.IValidatorRepository;

	// TODO: Add interface
	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepository!: RoundStateRepository;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	#roundState!: Contracts.Consensus.IRoundState;
	#step: Step = Step.propose;
	#lockedValue?: Contracts.Consensus.IRoundState;
	#lockedRound?: number = undefined;
	#validValue?: Contracts.Consensus.IRoundState;
	#validRound?: number = undefined;

	#didMajorityPrevote = false;
	#didMajorityPrecommit = false;

	public getHeight(): number {
		return this.#roundState.height;
	}

	public getRound(): number {
		return this.#roundState.round;
	}

	public getStep(): Step {
		return this.#step;
	}

	// TODO: Only for testing
	public setStep(step: Step): void {
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

	public getState(): Record<string, unknown> {
		return {
			height: this.#roundState.height,
			lockedRound: this.#lockedRound,
			lockedValue: this.#lockedValue,
			round: this.#roundState.round,
			step: this.#step,
			validRound: this.#validRound,
			validValue: this.#validValue,
		};
	}

	public async run(): Promise<void> {
		const lastBlock = this.state.getLastBlock();

		void this.startRound(lastBlock.data.height + 1, 0);
	}

	public async startRound(height: number, round: number): Promise<void> {
		this.#step = Step.propose;
		this.#didMajorityPrevote = false;
		this.#didMajorityPrecommit = false;
		this.scheduler.clear();

		this.#roundState = await this.roundStateRepository.getRoundState(height, round);

		const proposer = this.validatorsRepository.getValidator(this.#roundState.proposer);

		this.logger.info(`>> Starting new round: ${height}/${round} with proposer ${this.#roundState.proposer}`);

		if (proposer) {
			// TODO: Error handling
			await this.#propose(proposer);
		} else {
			this.logger.info(`No registered proposer for ${this.#roundState.proposer}`);

			// TODO: Can we call this even even proposer is known?
			await this.scheduler.scheduleTimeoutPropose(height, round);
		}
	}

	// TODO: Implement proposal for validRound >= 0.
	public async onProposal(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		const proposal = roundState.getProposal();

		if (this.#step !== Step.propose || this.#isInvalidRoundState(roundState) || !proposal || proposal.validRound) {
			return;
		}

		// TODO: Check proposer
		this.logger.info(
			`Received proposal ${this.#roundState.height}/${this.#roundState.round} blockId: ${proposal.block.data.id}`,
		);

		const result = await this.processor.process(roundState);
		roundState.setProcessorResult(result);

		this.#step = Step.prevote;

		await this.#prevote(result ? proposal.block.data.id : undefined);
	}

	// TODO: Proposal should include +2/3 prevotes
	public async onProposalLocked(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		const proposal = roundState.getProposal();
		if (
			this.#step !== Step.propose ||
			this.#isInvalidRoundState(roundState) ||
			!proposal ||
			proposal.validRound === undefined ||
			proposal.validRound >= this.#roundState.round
		) {
			return;
		}

		this.logger.info(
			`Received proposal ${this.#roundState.height}/${this.#roundState.round} with locked blockId: ${
				proposal.block.data.id
			}`,
		);

		this.#step = Step.prevote;
		if (!this.#lockedRound || this.#lockedRound <= proposal.validRound) {
			const result = await this.processor.process(roundState);
			roundState.setProcessorResult(result);

			if (result) {
				await this.#prevote(proposal.block.data.id);
				return;
			}
		}

		await this.#prevote();
	}

	public async onMajorityPrevote(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		const proposal = roundState.getProposal();

		if (
			this.#didMajorityPrevote ||
			this.#step === Step.propose ||
			this.#isInvalidRoundState(roundState) ||
			!proposal ||
			!roundState.getProcessorResult()
		) {
			return;
		}

		this.logger.info(
			`Received +2/3 prevotes for ${this.#roundState.height}/${this.#roundState.round} proposer: ${
				proposal.validatorPublicKey
			} blockId: ${proposal.block.data.id}`,
		);

		this.#didMajorityPrevote = true;

		if (this.#step === Step.prevote) {
			this.#lockedValue = roundState;
			this.#lockedRound = this.#roundState.round;
			this.#validValue = roundState;
			this.#validRound = this.#roundState.round;
			this.#step = Step.precommit;

			await this.#precommit(proposal.block.data.id);
		} else {
			this.#validValue = roundState;
			this.#validRound = this.#roundState.round;
		}
	}

	public async onMajorityPrevoteAny(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		if (this.#step !== Step.prevote || this.#isInvalidRoundState(roundState)) {
			return;
		}

		void this.scheduler.scheduleTimeoutPrevote(this.#roundState.height, this.#roundState.round);
	}

	public async onMajorityPrevoteNull(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		if (this.#step !== Step.prevote || this.#isInvalidRoundState(roundState)) {
			return;
		}

		// ADD: Log info

		this.#step = Step.precommit;

		await this.#precommit();
	}

	public async onMajorityPrecommitAny(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		void this.scheduler.scheduleTimeoutPrecommit(this.#roundState.height, this.#roundState.round);
	}

	public async onMajorityPrecommit(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		const proposal = roundState.getProposal();
		if (this.#didMajorityPrecommit || this.#isInvalidRoundState(roundState) || !proposal) {
			return;
		}

		this.#didMajorityPrecommit = true;

		if (!roundState.getProcessorResult()) {
			this.logger.info(
				`Block ${proposal.block.data.id} on height ${
					this.#roundState.height
				} received +2/3 precommti but is invalid`,
			);
			return;
		}
		this.logger.info(
			`Received +2/3 precommits for ${this.#roundState.height}/${this.#roundState.round} proposer: ${
				proposal.validatorPublicKey
			} blockId: ${proposal.block.data.id}`,
		);

		await this.processor.commit(roundState);

		// TODO: Caclulate timeout
		// TODO: Wait for other approvals if needed
		await delay(80);

		this.#lockedRound = undefined;
		this.#lockedValue = undefined;
		this.#validRound = undefined;
		this.#validValue = undefined;

		setImmediate(() => this.startRound(this.#roundState.height + 1, 0));
	}

	async onMinorityWithHigherRound(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		if (roundState.height !== this.#roundState.height || roundState.round <= this.#roundState.round) {
			return;
		}

		setImmediate(() => this.startRound(this.#roundState.height, roundState.round));
	}

	public async onTimeoutPropose(height: number, round: number): Promise<void> {
		if (this.#step !== Step.propose || this.#roundState.height !== height || this.#roundState.round !== round) {
			return;
		}

		this.#step = Step.prevote;
		await this.#prevote();
	}

	public async onTimeoutPrevote(height: number, round: number): Promise<void> {
		if (this.#step !== Step.prevote || this.#roundState.height !== height || this.#roundState.round !== round) {
			return;
		}

		this.#step = Step.precommit;
		await this.#precommit();
	}

	public async onTimeoutPrecommit(height: number, round: number): Promise<void> {
		if (this.#roundState.height !== height || this.#roundState.round !== round) {
			return;
		}

		setImmediate(() => this.startRound(this.#roundState.height, this.#roundState.round + 1));
	}

	#isInvalidRoundState(roundState: Contracts.Consensus.IRoundState): boolean {
		if (roundState.height !== this.#roundState.height) {
			return true;
		}

		if (roundState.round !== this.#roundState.round) {
			return true;
		}

		return false;
	}

	async #propose(proposer: Contracts.Consensus.IValidator): Promise<void> {
		let block: Contracts.Crypto.IBlock;
		const existingProposal = this.#validValue?.getProposal();
		if (this.#validValue && existingProposal) {
			block = existingProposal.block;
		} else {
			block = await proposer.prepareBlock(this.#roundState.height, this.#roundState.round);
		}

		const proposal = await proposer.propose(
			this.#roundState.height,
			this.#roundState.round,
			block,
			this.#validRound,
		);

		await this.broadcaster.broadcastProposal(proposal);
		await this.handler.onProposal(proposal);
	}

	async #prevote(value?: string): Promise<void> {
		for (const validator of this.validatorsRepository.getValidators(this.#roundState.validators)) {
			const precommit = await validator.prevote(this.#roundState.height, this.#roundState.round, value);

			await this.broadcaster.broadcastPrevote(precommit);
			await this.handler.onPrevote(precommit);
		}
	}

	async #precommit(value?: string): Promise<void> {
		for (const validator of this.validatorsRepository.getValidators(this.#roundState.validators)) {
			const precommit = await validator.precommit(this.#roundState.height, this.#roundState.round, value);

			await this.broadcaster.broadcastPrecommit(precommit);
			await this.handler.onPrecommit(precommit);
		}
	}
}

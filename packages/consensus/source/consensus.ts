import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import delay from "delay";

import { Step } from "./enums";

@injectable()
export class Consensus implements Contracts.Consensus.IConsensusService {
	@inject(Identifiers.BlockProcessor)
	private readonly processor: Contracts.BlockProcessor.Processor;

	@inject(Identifiers.StateStore)
	private readonly state: Contracts.State.StateStore;

	@inject(Identifiers.Consensus.Handler)
	private readonly handler: Contracts.Consensus.IHandler;

	@inject(Identifiers.Consensus.Broadcaster)
	private readonly broadcaster: Contracts.Consensus.IBroadcaster;

	@inject(Identifiers.Consensus.Scheduler)
	private readonly scheduler: Contracts.Consensus.IScheduler;

	// TODO: Rename identifier
	@inject(Identifiers.Consensus.ValidatorRepository)
	private readonly validatorsRepository: Contracts.Consensus.IValidatorRepository;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet: Contracts.ValidatorSet.IValidatorSet;

	@inject(Identifiers.LogService)
	private readonly logger: Contracts.Kernel.Logger;

	#height = 2;
	#round = 0;
	#step: Step = Step.propose;
	#lockedValue: undefined; // TODO: type
	#lockedRound?: number = undefined;
	#validValue: undefined; // TODO: type
	#validRound?: number = undefined;

	public getHeight(): number {
		return this.#height;
	}

	public getRound(): number {
		return this.#round;
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
			height: this.#height,
			lockedRound: this.#lockedRound,
			lockedValue: this.#lockedValue,
			round: this.#round,
			step: this.#step,
			validRound: this.#validRound,
			validValue: this.#validValue,
		};
	}

	public async run(): Promise<void> {
		const lastBlock = this.state.getLastBlock();
		this.#height = lastBlock.data.height + 1;

		void this.startRound(this.#round);
	}

	public async startRound(round: number): Promise<void> {
		this.#round = round;
		this.#step = Step.propose;

		const proposerPublicKey = await this.#getProposerPublicKey(this.#height, round);
		const proposer = this.validatorsRepository.getValidator(proposerPublicKey);

		this.logger.info(`>> Starting new round: ${this.#height}/${this.#round} with proposer ${proposerPublicKey}`);

		if (proposer) {
			// TODO: Error handling
			await this.#propose(proposer);
		} else {
			this.logger.info(`No registered proposer for ${proposerPublicKey}`);

			// TODO: Can we call this even even proposer is known?
			await this.scheduler.scheduleTimeoutPropose(this.#height, this.#round);
		}
	}

	// TODO: Implement proposal for validRound >= 0.
	public async onProposal(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		const proposal = roundState.getProposal();

		if (this.#step !== Step.propose || this.#isInvalidRoundState(roundState) || !proposal || proposal.validRound) {
			return;
		}

		// TODO: Check proposer

		this.logger.info(`Received proposal ${this.#height}/${this.#round} blockId: ${proposal.block.data.id}`);

		const result = await this.processor.process(roundState);
		roundState.setProcessorResult(result);

		this.#step = Step.prevote;

		const activeValidators = await this.#getActiveValidators();
		for (const validator of this.validatorsRepository.getValidators(activeValidators)) {
			const prevote = await validator.prevote(
				this.#height,
				this.#round,
				result ? proposal.block.data.id : undefined,
			);

			await this.broadcaster.broadcastPrevote(prevote);
			await this.handler.onPrevote(prevote);
		}
	}

	public async onMajorityPrevote(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		if (this.#step !== Step.prevote) {
			return;
		}

		const proposal = roundState.getProposal();
		Utils.assert.defined(proposal);

		this.logger.info(
			`Received +2/3 prevotes for ${this.#height}/${this.#round} proposer: ${
				proposal.validatorPublicKey
			} blockId: ${proposal.block.data.id}`,
		);

		this.#step = Step.precommit;

		const activeValidators = await this.#getActiveValidators();
		for (const validator of this.validatorsRepository.getValidators(activeValidators)) {
			const precommit = await validator.precommit(this.#height, this.#round, proposal.block.data.id);

			await this.broadcaster.broadcastPrecommit(precommit);
			await this.handler.onPrecommit(precommit);
		}
	}

	public async onMajorityPrevoteAny(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		if (this.#step !== Step.prevote || this.#isInvalidRoundState(roundState)) {
			return;
		}

		// TODO: Check that its called only once
		void this.scheduler.scheduleTimeoutPrevote(this.#height, this.#round);
	}

	public async onMajorityPrevoteNull(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		if (this.#step !== Step.prevote || this.#isInvalidRoundState(roundState)) {
			return;
		}

		// ADD: Log info

		this.#step = Step.precommit;

		const activeValidators = await this.#getActiveValidators();
		for (const validator of this.validatorsRepository.getValidators(activeValidators)) {
			const precommit = await validator.precommit(this.#height, this.#round, undefined);

			await this.broadcaster.broadcastPrecommit(precommit);
			await this.handler.onPrecommit(precommit);
		}
	}

	public async onMajorityPrecommit(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		if (this.#step !== Step.precommit) {
			return;
		}

		const proposal = roundState.getProposal();
		Utils.assert.defined(proposal);

		this.logger.info(
			`Received +2/3 precommits for ${this.#height}/${this.#round} proposer: ${
				proposal.validatorPublicKey
			} blockId: ${proposal.block.data.id}`,
		);

		if (roundState.getProcessorResult()) {
			await this.processor.commit(roundState);
		} else {
			this.logger.info(`Block ${proposal.block.data.height} rejected`);
		}

		await delay(8000);

		this.#height++;
		await this.startRound(0);
	}

	public async onTimeoutPropose(height: number, round: number): Promise<void> {}

	public async onTimeoutPrevote(height: number, round: number): Promise<void> {}

	public async onTimeoutPrecommit(height: number, round: number): Promise<void> {}

	#isInvalidRoundState(roundState: Contracts.Consensus.IRoundState): boolean {
		if (roundState.height !== this.#height) {
			return true;
		}

		if (roundState.round !== this.#round) {
			return true;
		}

		return false;
	}

	async #propose(proposer: Contracts.Consensus.IValidator): Promise<void> {
		// TODO: Handle locked value
		const block = await proposer.prepareBlock(this.#height, this.#round);

		// TODO: Add valid round to proposal
		const proposal = await proposer.propose(this.#height, this.#round, block, this.#validRound);

		await this.broadcaster.broadcastProposal(proposal);
		await this.handler.onProposal(proposal);
	}

	async #getProposerPublicKey(height: number, round: number): Promise<string> {
		const activeValidators = await this.validatorSet.getActiveValidators();
		return activeValidators[0].getAttribute("consensus.publicKey");
	}

	async #getActiveValidators(): Promise<string[]> {
		const activeValidators = await this.validatorSet.getActiveValidators();

		return activeValidators.map((wallet) => wallet.getAttribute("consensus.publicKey"));
	}
}

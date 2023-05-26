import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import delay from "delay";

import { IScheduler } from "./types";

enum Step {
	propose = "propose",
	prevote = "prevote",
	precommit = "precommit",
}

@injectable()
export class Consensus implements Contracts.Consensus.IConsensusService {
	@inject(Identifiers.LogService)
	private readonly logger: Contracts.Kernel.Logger;

	@inject(Identifiers.BlockProcessor)
	private readonly processor: Contracts.BlockProcessor.Processor;

	@inject(Identifiers.Database.Service)
	private readonly database: Contracts.Database.IDatabaseService;

	@inject(Identifiers.Consensus.Scheduler)
	private readonly scheduler: IScheduler;

	@inject(Identifiers.Consensus.ValidatorRepository)
	private readonly validatorsRepository: Contracts.Consensus.IValidatorRepository;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet: Contracts.ValidatorSet.IValidatorSet;

	#height = 2;
	#round = 0;
	#step: Step = Step.propose;
	#lockedValue: undefined;
	#lockedRound = -1;
	#validValue: undefined;
	#validRound = -1;

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
		const lastBlock = await this.database.getLastBlock();
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
			// TODO: Handle locked value

			const block = await proposer.prepareBlock(this.#height, round);

			// TODO: Add valid round to proposal
			await proposer.propose(this.#height, this.#round, block);
		} else {
			this.logger.info(`No registered proposer for ${proposerPublicKey}`);

			await this.scheduler.scheduleTimeoutPropose(this.#height, this.#round);
		}
	}

	// TODO: Implement proposal for validRound >= 0.
	public async onProposal(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		if (this.#step !== Step.propose) {
			return;
		}

		const proposal = roundState.getProposal();
		Utils.assert.defined(proposal);

		this.logger.info(
			`Received proposal ${this.#height}/${this.#round} blockId: ${proposal.toData().block.data.id}`,
		);

		const result = await this.processor.process(roundState);
		roundState.setProcessorResult(result);

		this.#step = Step.prevote;

		const activeValidators = await this.#getActiveValidators();
		for (const validator of this.validatorsRepository.getValidators(activeValidators)) {
			await validator.prevote(this.#height, this.#round, result ? proposal.toData().block.data.id : undefined);
		}
	}

	public async onMajorityPrevote(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		if (this.#step !== Step.prevote) {
			return;
		}

		const proposal = roundState.getProposal();
		Utils.assert.defined(proposal);

		const proposalData = proposal.toData();

		this.logger.info(
			`Received +2/3 prevotes for ${this.#height}/${this.#round} proposer: ${
				proposalData.validatorPublicKey
			} blockId: ${proposalData.block.data.id}`,
		);

		this.#step = Step.precommit;

		const activeValidators = await this.#getActiveValidators();
		for (const validator of this.validatorsRepository.getValidators(activeValidators)) {
			await validator.precommit(this.#height, this.#round, proposalData.block.data.id);
		}
	}

	public async onMajorityPrecommit(roundState: Contracts.Consensus.IRoundState): Promise<void> {
		if (this.#step !== Step.precommit) {
			return;
		}

		const proposal = roundState.getProposal();
		Utils.assert.defined(proposal);

		const proposalData = proposal.toData();

		this.logger.info(
			`Received +2/3 precommits for ${this.#height}/${this.#round} proposer: ${
				proposalData.validatorPublicKey
			} blockId: ${proposalData.block.data.id}`,
		);

		if (roundState.getProcessorResult()) {
			await this.processor.commit(roundState);
		} else {
			this.logger.info(`Block ${proposalData.block.data.height} rejected`);
		}

		await delay(8000);

		this.#height++;
		await this.startRound(0);
	}

	public async onTimeoutPropose(height: number, round: number): Promise<void> {}

	public async onTimeoutPrevote(height: number, round: number): Promise<void> {}

	public async onTimeoutPrecommit(height: number, round: number): Promise<void> {}

	async #getProposerPublicKey(height: number, round: number): Promise<string> {
		const activeValidators = await this.validatorSet.getActiveValidators();
		return activeValidators[0].getAttribute("consensus.publicKey");
	}

	async #getActiveValidators(): Promise<string[]> {
		const activeValidators = await this.validatorSet.getActiveValidators();

		return activeValidators.map((wallet) => wallet.getAttribute("consensus.publicKey"));
	}
}

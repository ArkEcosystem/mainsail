import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import delay from "delay";

import { IBroadcaster, IHandler, IScheduler, IValidatorRepository } from "./types";

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

	@inject(Identifiers.Consensus.Handler)
	private readonly handler: IHandler;

	@inject(Identifiers.Consensus.Broadcaster)
	private readonly broadcaster: IBroadcaster;

	@inject(Identifiers.Consensus.Scheduler)
	private readonly scheduler: IScheduler;

	@inject(Identifiers.Consensus.ValidatorRepository)
	private readonly validatorsRepository: IValidatorRepository;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet: Contracts.ValidatorSet.IValidatorSet;

	#height = 2;
	#round = 0;
	#step: Step = Step.propose;
	#lockedValue: undefined;
	#lockedRound = -1;
	#validValue: undefined;
	#validRound = -1;

	public async configure(): Promise<void> {
		const lastBlock = await this.database.getLastBlock();
		this.#height = lastBlock.data.height + 1;
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
		await this.startRound(this.#round);
	}

	public async startRound(round: number): Promise<void> {
		this.#round = round;
		this.#step = Step.propose;

		const proposerPublicKey = await this.#getProposerPublicKey(this.#height, round);
		const proposer = this.validatorsRepository.getValidator(proposerPublicKey);

		this.logger.info(`Starting new round: ${this.#height}/${this.#round} with proposer ${proposerPublicKey}`);

		if (proposer) {
			const block = await proposer.prepareBlock(this.#height, round);

			const proposal = await proposer.propose(this.#height, this.#round, block);

			await this.broadcaster.broadcastProposal(proposal);
			await this.handler.onProposal(proposal);
		} else {
			this.logger.info(`No registered proposer for ${proposerPublicKey}`);

			await this.scheduler.scheduleTimeoutPropose(this.#height, this.#round);
		}
	}

	public async onProposal(proposal: Contracts.Crypto.IProposal): Promise<void> {
		if (this.#step !== Step.propose) {
			return;
		}

		this.logger.info(`Received proposal for ${this.#height}/${this.#round}`);

		this.#step = Step.prevote;

		const activeValidators = await this.#getActiveValidators();
		for (const validator of this.validatorsRepository.getValidators(activeValidators)) {
			const prevote = await validator.prevote(this.#height, this.#round, proposal.toData().block.data.id);

			await this.broadcaster.broadcastPrevote(prevote);
			await this.handler.onPrevote(prevote);
		}
	}

	public async onMajorityPrevote(proposal: Contracts.Crypto.IProposal): Promise<void> {
		if (this.#step !== Step.prevote) {
			return;
		}

		this.logger.info(`Received +2/3 prevotes for ${this.#height}/${this.#round}`);

		this.#step = Step.precommit;

		const activeValidators = await this.#getActiveValidators();
		for (const validator of this.validatorsRepository.getValidators(activeValidators)) {
			const precommit = await validator.precommit(this.#height, this.#round, proposal.toData().block.data.id);

			await this.broadcaster.broadcastPrecommit(precommit);
			await this.handler.onPrecommit(precommit);
		}
	}

	public async onMajorityPrecommit(proposal: Contracts.Crypto.IProposal): Promise<void> {
		if (this.#step !== Step.precommit) {
			return;
		}

		this.logger.info(`Received +2/3 precommits for ${this.#height}/${this.#round}`);

		const block = proposal.toData().block;
		const result = await this.processor.process(block);

		if (result === Contracts.BlockProcessor.ProcessorResult.Accepted) {
			await this.database.saveBlocks([block]);
		} else {
			this.logger.info(`Block ${block.data.height} rejected`);
		}

		await delay(8000);

		this.#height++;
		await this.startRound(0);
	}

	public async onTimeoutPropose(height: number, round: number): Promise<void> {}

	public async onTimeoutPrevote(height: number, round: number): Promise<void> {}

	public async onTimeoutPrecommit(height: number, round: number): Promise<void> {}

	async #getProposerPublicKey(height: number, round: number): Promise<string> {
		// TODO:
		const activeValidators = await this.validatorSet.getActiveValidators();
		return activeValidators[0].getAttribute("consensus.publicKey");
	}

	async #getActiveValidators(): Promise<string[]> {
		const activeValidators = await this.validatorSet.getActiveValidators();

		return activeValidators.map((wallet) => wallet.getAttribute("consensus.publicKey"));
	}
}

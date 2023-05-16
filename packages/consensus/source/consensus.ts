import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import delay from "delay";

import { Proposal } from "./proposal";
import { Validator } from "./validator";

enum Step {
	propose = "propose",
	prevote = "prevote",
	precommit = "precommit",
}

@injectable()
export class Consensus {
	@inject(Identifiers.LogService)
	private readonly logger: Contracts.Kernel.Logger;

	@inject(Identifiers.BlockProcessor)
	private readonly processor: Contracts.BlockProcessor.Processor;

	@inject(Identifiers.Database.Service)
	private readonly database: Contracts.Database.IDatabaseService;

	#height = 0;
	#round = 0;
	#step: Step = Step.propose;
	#lockedValue: undefined;
	#lockedRound = -1;
	#validValue: undefined;
	#validRound = -1;

	#validators: string[] = [];
	#registeredValidators: Map<string, Validator> = new Map();

	public configure(validators: string[], registeredValidators: Validator[]): Consensus {
		this.#validators = validators;
		this.#registeredValidators = new Map(
			registeredValidators.map((validator) => [validator.getPublicKey(), validator]),
		);

		return this;
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

		const proposerPublicKey = this.#getProposerPublicKey(this.#height, round);
		const proposer = this.#getRegisteredProposer(proposerPublicKey);

		this.logger.info(`Starting new round: ${this.#height}/${this.#round} with proposer ${proposerPublicKey}`);

		if (proposer) {
			const block = await proposer.prepareBlock(this.#height, round);

			const proposal = await proposer.propose(this.#height, this.#round, block);

			await this.#broadcastProposal(proposal);
		} else {
			this.logger.info(`No registered proposer for ${proposerPublicKey}`);
		}
	}

	public async onProposal(proposal: Proposal): Promise<void> {
		const result = await this.processor.process(proposal.toData().block);

		if (result === Contracts.BlockProcessor.ProcessorResult.Accepted) {
			await this.database.saveBlocks([proposal.toData().block]);
		} else {
			this.logger.info(`Block ${proposal.toData().block.data.height} rejected`);
		}

		await delay(8000);

		this.#height++;
		await this.startRound(0);
	}

	async #broadcastProposal(proposal: Proposal): Promise<void> {
		this.logger.info(`Broadcasting proposal: ${proposal}`);

		await this.onProposal(proposal);
	}

	#getProposerPublicKey(height: number, round: number): string {
		return this.#validators[0];
	}

	#getRegisteredProposer(publicKey: string): Validator | undefined {
		return this.#registeredValidators.get(publicKey);
	}
}

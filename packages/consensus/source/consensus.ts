import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import delay from "delay";

import { Broadcaster } from "./broadcaster";
import { Handler } from "./handler";
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

	@inject(Identifiers.Consensus.Handler)
	private readonly handler: Handler;

	@inject(Identifiers.Consensus.Broadcaster)
	private readonly broadcaster: Broadcaster;

	#height = 2;
	#round = 0;
	#step: Step = Step.propose;
	#lockedValue: undefined;
	#lockedRound = -1;
	#validValue: undefined;
	#validRound = -1;

	#validators: string[] = [];
	#registeredValidators: Map<string, Validator> = new Map();

	public async configure(validators: string[], registeredValidators: Validator[]): Promise<Consensus> {
		this.#validators = validators;
		this.#registeredValidators = new Map(
			registeredValidators.map((validator) => [validator.getPublicKey(), validator]),
		);

		const lastBlock = await this.database.getLastBlock();
		this.#height = lastBlock.data.height + 1;

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

			await this.broadcaster.broadcastProposal(proposal);
			await this.handler.onProposal(proposal);
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

	#getProposerPublicKey(height: number, round: number): string {
		return this.#validators[0];
	}

	#getRegisteredProposer(publicKey: string): Validator | undefined {
		return this.#registeredValidators.get(publicKey);
	}
}

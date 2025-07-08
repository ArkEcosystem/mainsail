import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { Controller } from "./controller.js";

@injectable()
export class RoundController extends Controller {
	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	@inject(Identifiers.BlockchainUtils.ProposerCalculator)
	private readonly proposerCalculator!: Contracts.BlockchainUtils.ProposerCalculator;

	@inject(Identifiers.BlockchainUtils.RoundCalculator)
	private readonly roundCalculator!: Contracts.BlockchainUtils.RoundCalculator;

	public async index(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const roundValidators = this.validatorSet.getRoundValidators();

		const orderedValidators = Array.from(
			{ length: roundValidators.length },
			(_, index) => roundValidators[this.proposerCalculator.getValidatorIndex(index)],
		);

		const blockNumber = this.stateStore.getBlockNumber();

		return {
			blockNumber,
			...this.roundCalculator.calculateRound(blockNumber),
			// Map the round validator set (static, vote-weighted, etc.) to actual proposal order
			validators: orderedValidators.map((validator) => ({
				voteBalance: validator.voteBalance.toFixed(),

				wallet: validator,
			})),
		};
	}
}

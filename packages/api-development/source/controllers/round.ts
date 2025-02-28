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
		const activeValidators = this.validatorSet.getActiveValidators();

		const orderedValidators = Array.from(
			{ length: activeValidators.length },
			(_, index) => activeValidators[this.proposerCalculator.getValidatorIndex(index)],
		);

		const height = this.stateStore.getHeight();

		return {
			height,
			...this.roundCalculator.calculateRound(height),
			// Map the active validator set (static, vote-weighted, etc.) to actual proposal order
			validators: orderedValidators.map((validator) => ({
				// eslint-disable-next-line sort-keys-fix/sort-keys-fix
				// rank: validator.getVoteBalance().toFixed(),
				voteBalance: validator.voteBalance.toFixed(),

				wallet: validator.toString(),
			})),
		};
	}
}

import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

import { Controller } from "./controller.js";

@injectable()
export class RoundController extends Controller {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	@inject(Identifiers.Proposer.Selector)
	private readonly proposerSelector!: Contracts.Proposer.Selector;

	public async index(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const activeValidators = this.validatorSet.getActiveValidators();

		const orderedValidators = Array.from(
			{ length: activeValidators.length },
			(_, index) => activeValidators[this.proposerSelector.getValidatorIndex(index)],
		);

		const height = this.stateService.getStore().getLastHeight();

		return {
			height,
			...Utils.roundCalculator.calculateRound(height, this.configuration),
			// Map the active validator set (static, vote-weighted, etc.) to actual proposal order
			validators: orderedValidators.map((validator) => ({
				wallet: validator.toString(),
				// eslint-disable-next-line sort-keys-fix/sort-keys-fix
				// rank: validator.getVoteBalance().toFixed(),
				voteBalance: validator.voteBalance.toFixed(),
			})),
		};
	}
}

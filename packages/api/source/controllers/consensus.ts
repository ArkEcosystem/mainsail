import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

import { Controller } from "./controller";

@injectable()
export class ConsensusController extends Controller {
	@inject(Identifiers.Consensus.Storage)
	private readonly storage!: Contracts.Consensus.IConsensusStorage;

	public async state(request: Hapi.Request) {
		const state = await this.storage.getState();
		if (!state) {
			return {};
		}

		Utils.assert.defined<Contracts.Consensus.IConsensusState>(state);

		return {
			data: {
				height: state.height,
				lockedRound: state.lockedRound,
				lockedValue: state.lockedValue ? state.lockedValue.toData() : null,
				round: state.round,
				step: state.step,
				validRound: state.validRound,
				validValue: state.validValue ? state.validValue.toData() : null,
			},
		};
	}
}

// import { Utils } from "@mainsail/kernel";
import { Contracts } from "@mainsail/contracts";

import { Controller } from "./controller";

export class BlockchainController extends Controller {
	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	public async index() {
		const { data } = this.stateStore.getLastBlock();

		return {
			data: {
				block: {
					height: data.height,
					id: data.id,
				},
				// supply: Utils.supplyCalculator.calculate(data.height), // TODO: Enable supply calculator
			},
		};
	}
}

import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { Controller } from "./controller.js";

@injectable()
export class BlockchainController extends Controller {
	@inject(Identifiers.BlockchainUtils.SupplyCalculator)
	private readonly supplyCalculator!: Contracts.BlockchainUtils.SupplyCalculator;

	public async index() {
		const { data } = this.stateStore.getLastBlock();

		return {
			data: {
				block: {
					height: data.height,
					id: data.id,
				},
				supply: this.supplyCalculator.calculateSupply(data.height),
			},
		};
	}
}

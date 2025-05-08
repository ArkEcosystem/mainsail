import { inject, injectable, injectFromBase } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { Controller } from "./controller.js";

@injectable()
@injectFromBase()
export class BlockchainController extends Controller {
	@inject(Identifiers.BlockchainUtils.SupplyCalculator)
	private readonly supplyCalculator!: Contracts.BlockchainUtils.SupplyCalculator;

	public async index() {
		const { data } = this.stateStore.getLastBlock();

		return {
			data: {
				block: {
					height: data.number,
					id: data.hash,
				},
				supply: this.supplyCalculator.calculateSupply(data.number),
			},
		};
	}
}

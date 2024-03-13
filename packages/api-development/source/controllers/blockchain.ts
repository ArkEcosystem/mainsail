import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

import { Controller } from "./controller.js";

@injectable()
export class BlockchainController extends Controller {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

	public async index() {
		const { data } = this.stateService.getStore().getLastBlock();

		return {
			data: {
				block: {
					height: data.height,
					id: data.id,
				},
				supply: Utils.supplyCalculator.calculateSupply(data.height, this.cryptoConfiguration),
			},
		};
	}
}

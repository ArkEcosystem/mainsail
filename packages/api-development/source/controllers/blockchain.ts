import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { supplyCalculator } from "@mainsail/crypto-utils";

import { Controller } from "./controller.js";

@injectable()
export class BlockchainController extends Controller {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

	public async index() {
		const { data } = this.stateStore.getLastBlock();

		return {
			data: {
				block: {
					height: data.height,
					id: data.id,
				},
				supply: supplyCalculator.calculateSupply(data.height, this.cryptoConfiguration),
			},
		};
	}
}

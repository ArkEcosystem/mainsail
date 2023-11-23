import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

import { Controller } from "./controller";

@injectable()
export class BlockchainController extends Controller {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.IConfiguration;

	public async index() {
		const { data } = this.stateService.getStateStore().getLastBlock();

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

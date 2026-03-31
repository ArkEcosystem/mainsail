import type { Types } from "@mainsail/api-common";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

import { Controller } from "./controller.js";

@injectable()
export class NodeController extends Controller {
	@inject(Identifiers.P2P.Service)
	private readonly p2pService!: Contracts.P2P.Service;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public async status(request: Types.HapiRequest): Promise<object> {
		const lastBlock = this.stateStore.getLastBlock();
		const networkBlockNumber = this.p2pService.getNetworkBlockNumberPercentile(90);

		return {
			data: {
				blockNumber: lastBlock.number,
				networkBlockNumber: networkBlockNumber,
				synced: lastBlock.number >= networkBlockNumber - 1,
			},
		};
	}

	public async configurationNode(request: Types.HapiRequest): Promise<object> {
		const network = this.configuration.all()!.network;

		return {
			data: {
				constants: this.configuration.getMilestone(this.stateStore.getBlockNumber()),
				core: {
					version: this.app.version(),
				},
				explorer: network.client.explorer,
				nethash: network.nethash,
				symbol: network.client.symbol,
				token: network.client.token,
				version: network.pubKeyHash,
				wif: network.wif,
			},
		};
	}

	public async configurationCrypto(request: Types.HapiRequest): Promise<object> {
		return {
			data: this.configuration.all(),
		};
	}
}

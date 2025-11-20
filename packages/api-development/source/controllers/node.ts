import Hapi from "@hapi/hapi";
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

	public async status(request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<object> {
		const lastBlock = this.stateStore.getLastBlock();
		const networkBlockNumber = this.p2pService.getNetworkBlockNumberPercentile(90);

		return {
			data: {
				blockNumber: lastBlock.data.number,
				networkBlockNumber: networkBlockNumber,
				synced: lastBlock.data.number >= networkBlockNumber - 1,
			},
		};
	}

	public async configurationNode(request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<object> {
		const network = this.configuration.all()!.network;

		return {
			data: {
				constants: this.configuration.getMilestone(this.stateStore.getBlockNumber()),
				core: {
					version: this.app.version(),
				},
				explorer: network.client.explorer,
				nethash: network.nethash,
				slip44: network.slip44,
				symbol: network.client.symbol,
				token: network.client.token,
				version: network.pubKeyHash,
				wif: network.wif,
			},
		};
	}

	public async configurationCrypto(): Promise<object> {
		return {
			data: this.configuration.all(),
		};
	}
}

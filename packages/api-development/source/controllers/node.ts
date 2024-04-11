import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { Controller } from "./controller.js";

@injectable()
export class NodeController extends Controller {
	@inject(Identifiers.P2P.Service)
	private readonly p2pService!: Contracts.P2P.Service;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public async status(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const lastBlock = this.stateService.getStore().getLastBlock();
		const networkHeight = this.p2pService.getNetworkHeight();

		return {
			data: {
				height: lastBlock.data.height,
				networkHeight: networkHeight - 1, // Use -1 to determine last block state. Consensus state is provided.
				synced: lastBlock.data.height + 1 >= networkHeight,
			},
		};
	}

	public async configurationNode(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		const network = this.configuration.all()!.network;

		return {
			data: {
				constants: this.configuration.getMilestone(this.stateService.getStore().getLastHeight()),
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

	public async configurationCrypto() {
		return {
			data: this.configuration.all(),
		};
	}
}

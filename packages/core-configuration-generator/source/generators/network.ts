import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";
import { Types } from "@arkecosystem/core-kernel";

@injectable()
export class NetworkGenerator {
	generate(nethash: string, options: Contracts.NetworkGenerator.NetworkOptions): Types.JsonObject {
		return {
			client: {
				explorer: options.explorer,
				symbol: options.symbol,
				token: options.token,
			},
			messagePrefix: `${options.network} message:\n`,
			name: options.network,
			nethash,
			pubKeyHash: options.pubKeyHash,
			slip44: 1,
			wif: options.wif,
		};
	}
}

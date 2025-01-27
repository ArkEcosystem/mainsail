import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class NetworkGenerator {
	generate(options: Contracts.NetworkGenerator.NetworkOptions): Contracts.Crypto.Network {
		return {
			chainId: options.chainId,
			client: {
				explorer: options.explorer,
				symbol: options.symbol,
				token: options.token,
			},
			messagePrefix: `${options.network} message:\n`,
			name: options.network,
			nethash: options.chainId.toString(16),
			pubKeyHash: options.pubKeyHash,
			slip44: 1,
			wif: options.wif,
		};
	}
}

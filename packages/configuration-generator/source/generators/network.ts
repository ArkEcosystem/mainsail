import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { sha256 } from "ethers";

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
			name: options.network,
			nethash: sha256(
				Buffer.concat([
					Buffer.from(options.chainId.toString(16) + options.token),
					options.nethashSalt ? Buffer.from(options.nethashSalt.toString(16)) : Buffer.alloc(0),
				]),
			).slice(2),
			pubKeyHash: options.pubKeyHash,
			slip44: 1,
			wif: options.wif,
		};
	}
}

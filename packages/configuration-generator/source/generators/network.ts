import { Identifiers } from "@mainsail/constants";
import { inject,injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

@injectable()
export class NetworkGenerator {
	@inject(Identifiers.Cryptography.Hash.Factory)
	private readonly hashFactory!: Contracts.Crypto.HashFactory;

	generate(options: Contracts.NetworkGenerator.NetworkOptions): Contracts.Crypto.Network {
		return {
			chainId: options.chainId,
			client: {
				explorer: options.explorer,
				symbol: options.symbol,
				token: options.token,
			},
			name: options.network,
			nethash: this.hashFactory.sha256(
				Buffer.concat([
					Buffer.from(options.chainId.toString(16) + options.token),
					options.nethashSalt ? Buffer.from(options.nethashSalt.toString(16)) : Buffer.alloc(0),
				]),
			).toString("hex"),
			pubKeyHash: options.pubKeyHash,
			slip44: 1,
			wif: options.wif,
		};
	}
}

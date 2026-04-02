import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { WifNetworkError } from "@mainsail/exceptions";
import { decode } from "wif";

@injectable()
export class WIFDecoder implements Contracts.Crypto.WIFDecoder {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public async toPrivateKey(wif: string): Promise<{
		compressed: boolean;
		privateKey: string;
	}> {
		const networkVersion = this.configuration.get<number>("network.wif")
		const decoded = decode(wif);

		if (decoded.version !== networkVersion) {
			throw new WifNetworkError(networkVersion, decoded.version);
		}

		return {
			compressed: decoded.compressed,
			privateKey: Buffer.from(decoded.privateKey).toString("hex"),
		}
	}
}

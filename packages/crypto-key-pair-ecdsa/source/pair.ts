import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { WifNetworkError } from "@mainsail/exceptions";
import { secp256k1, SHA256 } from "bcrypto";
import { decode } from "wif";

@injectable()
export class KeyPairFactory implements Contracts.Crypto.KeyPairFactory {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public async fromMnemonic(mnemonic: string, compressed: boolean = true): Promise<Contracts.Crypto.KeyPair> {
		return this.fromPrivateKey(SHA256.digest(Buffer.from(mnemonic, "utf8")), compressed);
	}

	public async fromPrivateKey(privateKey: Buffer, compressed: boolean = true): Promise<Contracts.Crypto.KeyPair> {
		return {
			compressed,
			privateKey: privateKey.toString("hex"),
			publicKey: secp256k1.publicKeyCreate(privateKey, compressed).toString("hex"),
		};
	}

	public async fromWIF(wif: string): Promise<Contracts.Crypto.KeyPair> {
		const networkVersion = this.configuration.getNetwork().wif;
		const decoded = decode(wif);

		if (decoded.version !== networkVersion) {
			throw new WifNetworkError(networkVersion, decoded.version);
		}

		return this.fromPrivateKey(Buffer.from(decoded.privateKey), decoded.compressed);
	}
}

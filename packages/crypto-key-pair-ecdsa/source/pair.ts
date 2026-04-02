import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { secp256k1, SHA256 } from "bcrypto";

@injectable()
export class KeyPairFactory implements Contracts.Crypto.KeyPairFactory {
	@inject(Identifiers.Cryptography.Identity.Wif.Factory)
	private readonly wifFactory!: Contracts.Crypto.WIFFactory;

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
		const decoded = await this.wifFactory.toPrivateKey(wif);
		return this.fromPrivateKey(Buffer.from(decoded.privateKey, "hex"), decoded.compressed);
	}
}

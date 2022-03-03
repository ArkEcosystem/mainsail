import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { schnorr, SHA256 } from "bcrypto";
import WIF from "wif";

@injectable()
export class KeyPairFactory implements Contracts.Crypto.IKeyPairFactory {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	public async fromMnemonic(mnemonic: string): Promise<Contracts.Crypto.IKeyPair> {
		return this.fromPrivateKey(SHA256.digest(Buffer.from(mnemonic, "utf8")));
	}

	public async fromPrivateKey(privateKey: Buffer): Promise<Contracts.Crypto.IKeyPair> {
		return {
			compressed: true,
			privateKey: privateKey.toString("hex"),
			publicKey: schnorr.publicKeyCreate(privateKey).toString("hex"),
		};
	}

	public async fromWIF(wif: string): Promise<Contracts.Crypto.IKeyPair> {
		const decoded = WIF.decode(wif, this.configuration.get("network.wif"));

		return {
			compressed: decoded.compressed,
			privateKey: decoded.privateKey.toString("hex"),
			publicKey: schnorr.publicKeyCreate(decoded.privateKey, decoded.compressed).toString("hex"),
		};
	}
}

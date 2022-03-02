import { Container } from "@arkecosystem/core-container";
import { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { schnorr, SHA256 } from "bcrypto";
import WIF from "wif";

@Container.injectable()
export class KeyPairFactory implements Crypto.IKeyPairFactory {
	@Container.inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Crypto.IConfiguration;

	public async fromMnemonic(mnemonic: string): Promise<Crypto.IKeyPair> {
		return this.fromPrivateKey(SHA256.digest(Buffer.from(mnemonic, "utf8")));
	}

	public async fromPrivateKey(privateKey: Buffer): Promise<Crypto.IKeyPair> {
		return {
			compressed: true,
			privateKey: privateKey.toString("hex"),
			publicKey: schnorr.publicKeyCreate(privateKey).toString("hex"),
		};
	}

	public async fromWIF(wif: string): Promise<Crypto.IKeyPair> {
		const decoded = WIF.decode(wif, this.configuration.get("network.wif"));

		return {
			compressed: decoded.compressed,
			privateKey: decoded.privateKey.toString("hex"),
			publicKey: schnorr.publicKeyCreate(decoded.privateKey, decoded.compressed).toString("hex"),
		};
	}
}

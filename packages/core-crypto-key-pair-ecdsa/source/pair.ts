import { Contracts } from "@arkecosystem/core-contracts";
import { secp256k1, SHA256 } from "bcrypto";
import WIF from "wif";

@injectable()
export class KeyPairFactory implements Contracts.Crypto.IKeyPairFactory {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	public async fromMnemonic(mnemonic: string, compressed = true): Promise<Contracts.Crypto.IKeyPair> {
		return this.fromPrivateKey(SHA256.digest(Buffer.from(mnemonic, "utf8")), compressed);
	}

	public async fromPrivateKey(privateKey: Buffer, compressed = true): Promise<Contracts.Crypto.IKeyPair> {
		return {
			compressed,
			privateKey: privateKey.toString("hex"),
			publicKey: secp256k1.publicKeyCreate(privateKey, compressed).toString("hex"),
		};
	}

	public async fromWIF(wif: string): Promise<Contracts.Crypto.IKeyPair> {
		const decoded = WIF.decode(wif, this.configuration.get("network.wif"));

		return {
			compressed: decoded.compressed,
			privateKey: decoded.privateKey.toString("hex"),
			publicKey: secp256k1.publicKeyCreate(decoded.privateKey, decoded.compressed).toString("hex"),
		};
	}
}

import { Container } from "@arkecosystem/core-container";
import { BINDINGS, IConfiguration, IKeyPair, IKeyPairFactory as Contract } from "@arkecosystem/core-crypto-contracts";
import { secp256k1, SHA256 } from "bcrypto";
import WIF from "wif";

@Container.injectable()
export class KeyPairFactory implements Contract {
	@Container.inject(BINDINGS.Configuration)
	private readonly configuration: IConfiguration;

	public async fromMnemonic(mnemonic: string, compressed = true): Promise<IKeyPair> {
		return this.fromPrivateKey(SHA256.digest(Buffer.from(mnemonic, "utf8")), compressed);
	}

	public async fromPrivateKey(privateKey: Buffer, compressed = true): Promise<IKeyPair> {
		return {
			compressed,
			privateKey: privateKey.toString("hex"),
			publicKey: secp256k1.publicKeyCreate(privateKey, compressed).toString("hex"),
		};
	}

	public async fromWIF(wif: string): Promise<IKeyPair> {
		const decoded = WIF.decode(wif, this.configuration.get("network.wif"));

		return {
			compressed: decoded.compressed,
			privateKey: decoded.privateKey.toString("hex"),
			publicKey: secp256k1.publicKeyCreate(decoded.privateKey, decoded.compressed).toString("hex"),
		};
	}
}

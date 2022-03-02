import { Container } from "@arkecosystem/core-container";
import { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { getPublicKey } from "@noble/bls12-381";
import { mnemonicToSeedSync } from "@scure/bip39";
import { deriveChild, deriveMaster } from "bls12-381-keygen";
import WIF from "wif";

@Container.injectable()
export class KeyPairFactory implements Crypto.IKeyPairFactory {
	@Container.inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Crypto.IConfiguration;

	public async fromMnemonic(mnemonic: string): Promise<Crypto.IKeyPair> {
		return this.#fromPrivateKey(deriveChild(deriveMaster(mnemonicToSeedSync(mnemonic)), 0));
	}

	public async fromPrivateKey(privateKey: Buffer): Promise<Crypto.IKeyPair> {
		return this.#fromPrivateKey(privateKey);
	}

	public async fromWIF(wif: string): Promise<Crypto.IKeyPair> {
		const decoded = WIF.decode(wif, this.configuration.get("network.wif"));

		return {
			compressed: decoded.compressed,
			privateKey: decoded.privateKey.toString("hex"),
			publicKey: Buffer.from(getPublicKey(decoded.privateKey)).toString("hex"),
		};
	}

	#fromPrivateKey(privateKey: Uint8Array): Crypto.IKeyPair {
		return {
			compressed: true,
			privateKey: Buffer.from(privateKey).toString("hex"),
			publicKey: Buffer.from(getPublicKey(privateKey)).toString("hex"),
		};
	}
}

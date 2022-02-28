import { Container } from "@arkecosystem/core-container";
import { BINDINGS, IConfiguration, IKeyPair, IKeyPairFactory as Contract } from "@arkecosystem/core-crypto-contracts";
import { getPublicKey } from "@noble/bls12-381";
import { mnemonicToSeedSync } from "@scure/bip39";
import { deriveChild, deriveMaster } from "bls12-381-keygen";
import WIF from "wif";

@Container.injectable()
export class KeyPairFactory implements Contract {
	@Container.inject(BINDINGS.Configuration)
	private readonly configuration: IConfiguration;

	public async fromMnemonic(mnemonic: string): Promise<IKeyPair> {
		return this.#fromPrivateKey(deriveChild(deriveMaster(mnemonicToSeedSync(mnemonic)), 0));
	}

	public async fromPrivateKey(privateKey: Buffer): Promise<IKeyPair> {
		return this.#fromPrivateKey(privateKey);
	}

	public async fromWIF(wif: string): Promise<IKeyPair> {
		const decoded = WIF.decode(wif, this.configuration.get("network.wif"));

		return {
			compressed: decoded.compressed,
			privateKey: decoded.privateKey.toString("hex"),
			publicKey: Buffer.from(getPublicKey(decoded.privateKey)).toString("hex"),
		};
	}

	#fromPrivateKey(privateKey: Uint8Array): IKeyPair {
		return {
			compressed: true,
			privateKey: Buffer.from(privateKey).toString("hex"),
			publicKey: Buffer.from(getPublicKey(privateKey)).toString("hex"),
		};
	}
}

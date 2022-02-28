import { Container } from "@arkecosystem/core-container";
import { BINDINGS, IConfiguration, IKeyPair, IKeyPairFactory as Contract } from "@arkecosystem/core-crypto-contracts";
import { getPublicKey } from "@noble/ed25519";
import { sha256 } from "@noble/hashes/sha256";
import { mnemonicToSeedSync } from "@scure/bip39";
import WIF from "wif";

@Container.injectable()
export class KeyPairFactory implements Contract {
	@Container.inject(BINDINGS.Configuration)
	private readonly configuration: IConfiguration;

	public async fromMnemonic(mnemonic: string): Promise<IKeyPair> {
		return this.#fromPrivateKey(sha256(mnemonicToSeedSync(mnemonic)));
	}

	public async fromPrivateKey(privateKey: Buffer): Promise<IKeyPair> {
		return this.#fromPrivateKey(privateKey);
	}

	public async fromWIF(wif: string): Promise<IKeyPair> {
		const decoded = WIF.decode(wif, this.configuration.get("network.wif"));

		return {
			compressed: decoded.compressed,
			privateKey: decoded.privateKey.toString("hex"),
			publicKey: Buffer.from(await getPublicKey(decoded.privateKey)).toString("hex"),
		};
	}

	async #fromPrivateKey(privateKey: Uint8Array): Promise<IKeyPair> {
		return {
			compressed: true,
			privateKey: Buffer.from(privateKey).toString("hex"),
			publicKey: Buffer.from(await getPublicKey(privateKey)).toString("hex"),
		};
	}
}

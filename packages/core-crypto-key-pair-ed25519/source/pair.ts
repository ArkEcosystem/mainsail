import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { getPublicKey } from "@noble/ed25519";
import { sha256 } from "@noble/hashes/sha256";
import { mnemonicToSeedSync } from "@scure/bip39";
import WIF from "wif";

@injectable()
export class KeyPairFactory implements Contracts.Crypto.IKeyPairFactory {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	public async fromMnemonic(mnemonic: string): Promise<Contracts.Crypto.IKeyPair> {
		return this.#fromPrivateKey(sha256(mnemonicToSeedSync(mnemonic)));
	}

	public async fromPrivateKey(privateKey: Buffer): Promise<Contracts.Crypto.IKeyPair> {
		return this.#fromPrivateKey(privateKey);
	}

	public async fromWIF(wif: string): Promise<Contracts.Crypto.IKeyPair> {
		const decoded = WIF.decode(wif, this.configuration.get("network.wif"));

		return {
			compressed: decoded.compressed,
			privateKey: decoded.privateKey.toString("hex"),
			publicKey: Buffer.from(await getPublicKey(decoded.privateKey)).toString("hex"),
		};
	}

	async #fromPrivateKey(privateKey: Uint8Array): Promise<Contracts.Crypto.IKeyPair> {
		return {
			compressed: true,
			privateKey: Buffer.from(privateKey).toString("hex"),
			publicKey: Buffer.from(await getPublicKey(privateKey)).toString("hex"),
		};
	}
}

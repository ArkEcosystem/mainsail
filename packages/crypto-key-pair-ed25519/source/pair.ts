import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { getPublicKey } from "@noble/ed25519";
// Fixes "etc.sha512Sync not set" (fix from https://github.com/paulmillr/noble-ed25519#usage)
import { etc } from "@noble/ed25519";
import { sha256 } from "@noble/hashes/sha256";
import { sha512 } from "@noble/hashes/sha512";
import { mnemonicToSeedSync } from "@scure/bip39";
import WIF from "wif";
etc.sha512Sync = (...m) => sha512(etc.concatBytes(...m));

@injectable()
export class KeyPairFactory implements Contracts.Crypto.KeyPairFactory {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public async fromMnemonic(mnemonic: string): Promise<Contracts.Crypto.KeyPair> {
		return this.#fromPrivateKey(sha256(mnemonicToSeedSync(mnemonic)));
	}

	public async fromPrivateKey(privateKey: Buffer): Promise<Contracts.Crypto.KeyPair> {
		return this.#fromPrivateKey(privateKey);
	}

	public async fromWIF(wif: string): Promise<Contracts.Crypto.KeyPair> {
		const decoded = WIF.decode(wif, this.configuration.get("network.wif"));
		const privateKey = Buffer.from(decoded.privateKey);

		return {
			compressed: decoded.compressed,
			privateKey: privateKey.toString("hex"),
			publicKey: Buffer.from(getPublicKey(privateKey)).toString("hex"),
		};
	}

	async #fromPrivateKey(privateKey: Uint8Array): Promise<Contracts.Crypto.KeyPair> {
		return {
			compressed: true,
			privateKey: Buffer.from(privateKey).toString("hex"),
			publicKey: Buffer.from(await getPublicKey(privateKey)).toString("hex"),
		};
	}
}

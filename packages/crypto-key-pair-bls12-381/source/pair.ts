import { SecretKey } from "@chainsafe/blst";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { mnemonicToSeedSync } from "@scure/bip39";
import { deriveChild, deriveMaster } from "bls12-381-keygen";
import WIF from "wif";

@injectable()
export class KeyPairFactory implements Contracts.Crypto.KeyPairFactory {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public async fromMnemonic(mnemonic: string): Promise<Contracts.Crypto.KeyPair> {
		return this.#fromPrivateKey(deriveChild(deriveMaster(mnemonicToSeedSync(mnemonic)), 0));
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
			publicKey: Buffer.from(SecretKey.fromBytes(decoded.privateKey).toPublicKey().toBytes()).toString("hex"),
		};
	}

	#fromPrivateKey(privateKey: Uint8Array): Contracts.Crypto.KeyPair {
		const secretKey = SecretKey.fromBytes(privateKey);
		return {
			compressed: true,
			privateKey: Buffer.from(privateKey).toString("hex"),
			publicKey: Buffer.from(secretKey.toPublicKey().toBytes()).toString("hex"),
		};
	}
}

import { SecretKey } from "@chainsafe/blst";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { mnemonicToSeedSync } from "@scure/bip39";
import { deriveChild, deriveMaster } from "bls12-381-keygen";
import WIF from "wif";

@injectable()
export class KeyPairFactory implements Contracts.Crypto.IKeyPairFactory {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	public async fromMnemonic(mnemonic: string): Promise<Contracts.Crypto.IKeyPair> {
		return this.#fromPrivateKey(deriveChild(deriveMaster(mnemonicToSeedSync(mnemonic)), 0));
	}

	public async fromPrivateKey(privateKey: Buffer): Promise<Contracts.Crypto.IKeyPair> {
		return this.#fromPrivateKey(privateKey);
	}

	public async fromWIF(wif: string): Promise<Contracts.Crypto.IKeyPair> {
		const decoded = WIF.decode(wif, this.configuration.get("network.wif"));

		return {
			compressed: decoded.compressed,
			privateKey: decoded.privateKey.toString("hex"),
			publicKey: Buffer.from(SecretKey.fromBytes(decoded.privateKey).toPublicKey().toBytes()).toString("hex"),
		};
	}

	#fromPrivateKey(privateKey: Uint8Array): Contracts.Crypto.IKeyPair {
		const secretKey = SecretKey.fromBytes(privateKey);
		return {
			compressed: true,
			privateKey: Buffer.from(privateKey).toString("hex"),
			publicKey: Buffer.from(secretKey.toPublicKey().toBytes()).toString("hex"),
		};
	}
}

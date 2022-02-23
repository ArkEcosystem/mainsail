import { Container } from "@arkecosystem/container";
import { IKeyPair, IKeyPairFactory as Contract } from "@arkecosystem/core-crypto-contracts";
import { getPublicKey } from "@noble/bls12-381";
import { deriveChild, deriveMaster } from "bls12-381-keygen";
import { mnemonicToSeedSync } from "@scure/bip39";
import WIF from "wif";

@Container.injectable()
export class KeyPairFactory implements Contract {
	public async fromMnemonic(mnemonic: string): Promise<IKeyPair> {
		return this.#fromPrivateKey(deriveChild(deriveMaster(mnemonicToSeedSync(mnemonic)), 0));
	}

	public async fromPrivateKey(privateKey: Buffer): Promise<IKeyPair> {
		return this.#fromPrivateKey(privateKey);
	}

	public async fromWIF(wif: string, version: number): Promise<IKeyPair> {
		const decoded = WIF.decode(wif, version);

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

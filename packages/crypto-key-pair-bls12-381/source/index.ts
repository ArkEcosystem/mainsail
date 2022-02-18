import { IKeyPair, IKeyPairFactory as Contract } from "@arkecosystem/crypto-contracts";
import { getPublicKey } from "@noble/bls12-381";
import { deriveChild, deriveMaster } from "bls12-381-keygen";
import { mnemonicToSeedSync } from "micro-bip39";

export class KeyPairFactory implements Contract {
	public async fromMnemonic(mnemonic: string): Promise<IKeyPair> {
		return this.#fromPrivateKey(deriveChild(deriveMaster(mnemonicToSeedSync(mnemonic)), 0));
	}

	public async fromPrivateKey(privateKey: Buffer): Promise<IKeyPair> {
		return this.#fromPrivateKey(privateKey);
	}

	#fromPrivateKey(privateKey: Uint8Array): IKeyPair {
		return {
			compressed: true,
			privateKey: Buffer.from(privateKey).toString("hex"),
			publicKey: Buffer.from(getPublicKey(privateKey)).toString("hex"),
		};
	}
}

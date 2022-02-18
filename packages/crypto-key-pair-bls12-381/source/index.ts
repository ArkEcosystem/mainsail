import { IKeyPair, IKeyPairFactory as Contract } from "@arkecosystem/crypto-contracts";
import { deriveChild, deriveMaster } from "bls12-381-keygen";
import { getPublicKey } from "@noble/bls12-381";
import { mnemonicToSeedSync } from "micro-bip39";

export class KeyPairFactory implements Contract {
	public fromMnemonic(mnemonic: string): IKeyPair {
		return this.#fromPrivateKey(deriveChild(deriveMaster(mnemonicToSeedSync(mnemonic)), 0));
	}

	public fromPrivateKey(privateKey: Buffer): IKeyPair {
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

import { IKeyPair, IKeyPairFactory as Contract } from "@arkecosystem/crypto-contracts";
import { schnorr, SHA256 } from "bcrypto";

export class KeyPairFactory implements Contract {
	public fromMnemonic(mnemonic: string): IKeyPair {
		return this.fromPrivateKey(SHA256.digest(Buffer.from(mnemonic, "utf8")));
	}

	public fromPrivateKey(privateKey: Buffer | string): IKeyPair {
		privateKey = privateKey instanceof Buffer ? privateKey : Buffer.from(privateKey, "hex");

		return {
			compressed: true,
			privateKey: privateKey.toString("hex"),
			publicKey: schnorr.publicKeyCreate(privateKey).toString("hex"),
		};
	}
}

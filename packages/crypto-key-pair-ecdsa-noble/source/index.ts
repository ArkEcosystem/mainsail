import { IKeyPair, IKeyPairFactory as Contract } from "@arkecosystem/crypto-contracts";
import { getPublicKey, utils } from "@noble/secp256k1";

export class KeyPairFactory implements Contract {
	public async fromMnemonic(mnemonic: string, compressed = true): Promise<IKeyPair> {
		return this.fromPrivateKey(Buffer.from(await utils.sha256(Buffer.from(mnemonic, "utf8"))), compressed);
	}

	public async fromPrivateKey(privateKey: Buffer, compressed = true): Promise<IKeyPair> {
		return {
			compressed,
			privateKey: privateKey.toString("hex"),
			publicKey: Buffer.from(getPublicKey(privateKey, compressed)).toString("hex"),
		};
	}
}

import { IKeyPair, IKeyPairFactory as Contract } from "@arkecosystem/crypto-contracts";
import { secp256k1, SHA256 } from "bcrypto";
import WIF from "wif";

export class KeyPairFactory implements Contract {
	public async fromMnemonic(mnemonic: string, compressed = true): Promise<IKeyPair> {
		return this.fromPrivateKey(SHA256.digest(Buffer.from(mnemonic, "utf8")), compressed);
	}

	public async fromPrivateKey(privateKey: Buffer, compressed = true): Promise<IKeyPair> {
		return {
			compressed,
			privateKey: privateKey.toString("hex"),
			publicKey: secp256k1.publicKeyCreate(privateKey, compressed).toString("hex"),
		};
	}

	public async fromWIF(wif: string, version: number): Promise<IKeyPair> {
		const decoded = WIF.decode(wif, version);

		return {
			compressed: decoded.compressed,
			privateKey: decoded.privateKey.toString("hex"),
			publicKey: secp256k1.publicKeyCreate(decoded.privateKey, decoded.compressed).toString("hex"),
		};
	}
}

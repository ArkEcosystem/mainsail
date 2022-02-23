import { Container } from "@arkecosystem/container";
import { IKeyPair, IKeyPairFactory as Contract } from "@arkecosystem/core-crypto-contracts";
import { schnorr, SHA256 } from "bcrypto";
import WIF from "wif";

@Container.injectable()
export class KeyPairFactory implements Contract {
	public async fromMnemonic(mnemonic: string): Promise<IKeyPair> {
		return this.fromPrivateKey(SHA256.digest(Buffer.from(mnemonic, "utf8")));
	}

	public async fromPrivateKey(privateKey: Buffer): Promise<IKeyPair> {
		return {
			compressed: true,
			privateKey: privateKey.toString("hex"),
			publicKey: schnorr.publicKeyCreate(privateKey).toString("hex"),
		};
	}

	public async fromWIF(wif: string, version: number): Promise<IKeyPair> {
		const decoded = WIF.decode(wif, version);

		return {
			compressed: decoded.compressed,
			privateKey: decoded.privateKey.toString("hex"),
			publicKey: schnorr.publicKeyCreate(decoded.privateKey, decoded.compressed).toString("hex"),
		};
	}
}

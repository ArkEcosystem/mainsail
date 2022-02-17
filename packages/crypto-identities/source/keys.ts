import { secp256k1 } from "bcrypto";
// @ts-ignore
import WIF from "wif";

import { KeyPair } from "./contracts";
import { NetworkVersionError } from "./errors";
import { HashAlgorithms } from "./hash-algorithms";

export class Keys {
	public static fromPassphrase(passphrase: string, compressed = true): KeyPair {
		return Keys.fromPrivateKey(HashAlgorithms.sha256(Buffer.from(passphrase, "utf8")), compressed);
	}

	public static fromPrivateKey(privateKey: Buffer | string, compressed = true): KeyPair {
		privateKey = privateKey instanceof Buffer ? privateKey : Buffer.from(privateKey, "hex");

		return {
			compressed,
			privateKey: privateKey.toString("hex"),
			publicKey: secp256k1.publicKeyCreate(privateKey, compressed).toString("hex"),
		};
	}

	public static fromWIF(wif: string, options: { wif: number }): KeyPair {
		const { version, compressed, privateKey } = WIF.decode(wif, options.wif);

		if (version !== options.wif) {
			throw new NetworkVersionError(options.wif, version);
		}

		return {
			compressed,
			privateKey: privateKey.toString("hex"),
			publicKey: secp256k1.publicKeyCreate(privateKey, compressed).toString("hex"),
		};
	}
}

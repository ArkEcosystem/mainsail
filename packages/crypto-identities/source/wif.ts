// @ts-ignore
import wif from "wif";

import { KeyPair } from "./contracts";
import { Keys } from "./keys";

export class WIF {
	public static fromPassphrase(passphrase: string, options: { wif: number }): string {
		const { compressed, privateKey }: KeyPair = Keys.fromPassphrase(passphrase);

		return wif.encode(options.wif, Buffer.from(privateKey, "hex"), compressed);
	}

	public static fromKeys(keys: KeyPair, options: { wif: number }): string {
		return wif.encode(options.wif, Buffer.from(keys.privateKey, "hex"), keys.compressed);
	}
}

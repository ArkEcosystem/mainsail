import { Keys } from "./keys";

export class PrivateKey {
	public static fromPassphrase(passphrase: string): string {
		return Keys.fromPassphrase(passphrase).privateKey;
	}

	public static fromWIF(wif: string, options: { wif: number }): string {
		return Keys.fromWIF(wif, options).privateKey;
	}
}

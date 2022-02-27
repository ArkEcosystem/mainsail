import { Delegate } from "./interfaces";
import { BIP38 } from "./methods/bip38";
import { BIP39 } from "./methods/bip39";

export class DelegateFactory {
	public static async fromBIP38(bip38: string, password: string): Promise<Delegate> {
		// if (!Crypto.bip38.verify(bip38)) {
		// 	throw new Error("not bip38");
		// }

		return new BIP38().configure(bip38, password);
	}

	public static async fromBIP39(passphrase: string): Promise<Delegate> {
		// if (Crypto.bip38.verify(passphrase)) {
		// 	throw new Error("seems to be bip38");
		// }

		return new BIP39(passphrase);
	}
}

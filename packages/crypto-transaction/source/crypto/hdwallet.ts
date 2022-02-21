import { BIP32Interface, fromPrivateKey, fromSeed } from "bip32";
import { mnemonicToSeedSync } from "bip39";

import { IKeyPair } from "../interfaces";
import { configManager } from "../managers";

export class HDWallet {
	public static readonly slip44 = 111;

	public static fromMnemonic(mnemonic: string, passphrase?: string): BIP32Interface {
		return fromSeed(mnemonicToSeedSync(mnemonic, passphrase), configManager.get("network"));
	}

	public static fromKeys(keys: IKeyPair, chainCode: Buffer): BIP32Interface {
		if (!keys.compressed) {
			throw new TypeError("BIP32 only allows compressed keys.");
		}

		return fromPrivateKey(Buffer.from(keys.privateKey, "hex"), chainCode, configManager.get("network"));
	}

	public static getKeys(node: BIP32Interface): IKeyPair {
		if (!node.privateKey) {
			throw new Error();
		}

		return {
			compressed: true,
			privateKey: node.privateKey.toString("hex"),
			publicKey: node.publicKey.toString("hex"),
		};
	}

	public static deriveSlip44(root: BIP32Interface, hardened = true): BIP32Interface {
		return root.derivePath(`m/44'/${this.slip44}${hardened ? "'" : ""}`);
	}

	public static deriveNetwork(root: BIP32Interface): BIP32Interface {
		return this.deriveSlip44(root).deriveHardened(configManager.get("network.aip20") || 1);
	}
}

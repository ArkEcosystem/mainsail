import type { Contracts } from "@mainsail/contracts";

import { injectable } from "@mainsail/container";
import { NotImplemented } from "@mainsail/exceptions";
import { mnemonicToSeedSync } from "@scure/bip39";
import { deriveChild, deriveMaster } from "bls12-381-keygen";

import { getBls } from "./get-bls.js";

@injectable()
export class KeyPairFactory implements Contracts.Crypto.KeyPairFactory {
	public async fromMnemonic(mnemonic: string): Promise<Contracts.Crypto.KeyPair> {
		return this.fromPrivateKey(Buffer.from(deriveChild(deriveMaster(mnemonicToSeedSync(mnemonic)), 0)));
	}

	public async fromPrivateKey(privateKey: Buffer, compressed: boolean = true): Promise<Contracts.Crypto.KeyPair> {
		const bls = await getBls();

		const secretKey = bls.SecretKey.fromBytes(privateKey);
		return {
			compressed,
			privateKey: privateKey.toString("hex"),
			publicKey: Buffer.from(secretKey.toPublicKey().toBytes()).toString("hex"),
		};
	}

	public async fromWIF(wif: string): Promise<Contracts.Crypto.KeyPair> {
		throw new NotImplemented(this.constructor.name, "fromWIF");
	}
}

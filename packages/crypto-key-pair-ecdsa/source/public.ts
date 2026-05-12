import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { NotImplemented } from "@mainsail/exceptions";
import { secp256k1 } from "bcrypto";

@injectable()
export class PublicKeyFactory implements Contracts.Crypto.PublicKeyFactory {
	@inject(Identifiers.Cryptography.Identity.KeyPair.Factory)
	private readonly keyPairFactory!: Contracts.Crypto.KeyPairFactory;

	public async fromMnemonic(mnemonic: string): Promise<string> {
		const { publicKey } = await this.keyPairFactory.fromMnemonic(mnemonic);
		return publicKey;
	}

	public async fromWIF(wif: string): Promise<string> {
		const { publicKey } = await this.keyPairFactory.fromWIF(wif);
		return publicKey;
	}

	public async verify(publicKey: string): Promise<boolean> {
		return secp256k1.publicKeyVerify(Buffer.from(publicKey, "hex"));
	}

	public async aggregate(publicKeys: Buffer[]): Promise<string> {
		throw new NotImplemented(this.constructor.name, "aggregate");
	}
}

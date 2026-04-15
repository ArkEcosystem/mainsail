import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { NotImplemented } from "@mainsail/exceptions";

@injectable()
export class PrivateKeyFactory implements Contracts.Crypto.PrivateKeyFactory {
	@inject(Identifiers.Cryptography.Identity.KeyPair.Factory)
	private readonly keyPairFactory!: Contracts.Crypto.KeyPairFactory;

	public async fromMnemonic(mnemonic: string): Promise<string> {
		const { privateKey } = await this.keyPairFactory.fromMnemonic(mnemonic);
		return privateKey;
	}

	public async fromWIF(wif: string): Promise<string> {
		throw new NotImplemented(this.constructor.name, "fromWIF");
	}
}

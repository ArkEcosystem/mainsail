import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

import { BIP38 } from "./methods/bip38";
import { BIP39 } from "./methods/bip39";

@injectable()
export class ValidatorFactory {
	@inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	public async fromBIP38(bip38: string, password: string): Promise<Contracts.Forger.Validator> {
		// if (!Crypto.bip38.verify(bip38)) {
		// 	throw new Error("not bip38");
		// }

		return this.app.resolve(BIP38).configure(bip38, password);
	}

	public async fromBIP39(passphrase: string): Promise<Contracts.Forger.Validator> {
		// if (Crypto.bip38.verify(passphrase)) {
		// 	throw new Error("seems to be bip38");
		// }

		return this.app.resolve(BIP39).configure(passphrase);
	}
}

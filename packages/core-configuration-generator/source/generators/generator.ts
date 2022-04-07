import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Application } from "@arkecosystem/core-kernel";

import { Wallet } from "../contracts";
import { Identifiers as InternalIdentifiers } from "../identifiers";
import { MnemonicGenerator } from "./mnemonic";

@injectable()
export class Generator {
	@inject(InternalIdentifiers.Application)
	protected app: Application;

	@inject(InternalIdentifiers.Generator.Mnemonic)
	private mnemonicGenerator: MnemonicGenerator;

	protected async createWallet(mnemonic?: string): Promise<Wallet> {
		if (!mnemonic) {
			mnemonic = this.mnemonicGenerator.generate();
		}

		const keys: Contracts.Crypto.IKeyPair = await this.app
			.get<Contracts.Crypto.IKeyPairFactory>(Identifiers.Cryptography.Identity.KeyPairFactory)
			.fromMnemonic(mnemonic);

		return {
			address: await this.app
				.get<Contracts.Crypto.IAddressFactory>(Identifiers.Cryptography.Identity.AddressFactory)
				.fromPublicKey(keys.publicKey),
			keys,
			passphrase: mnemonic,
			username: undefined,
		};
	}
}

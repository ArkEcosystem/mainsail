import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";

import { Wallet } from "../contracts";
import { Identifiers as InternalIdentifiers } from "../identifiers";
import { MnemonicGenerator } from "./mnemonic";

@injectable()
export class Generator {
	@inject(InternalIdentifiers.Application)
	protected app!: Application;

	@inject(InternalIdentifiers.Generator.Mnemonic)
	private mnemonicGenerator!: MnemonicGenerator;

	protected async createWallet(mnemonic?: string): Promise<Wallet> {
		if (!mnemonic) {
			mnemonic = this.mnemonicGenerator.generate();
		}

		const keys: Contracts.Crypto.IKeyPair = await this.app
			.getTagged<Contracts.Crypto.IKeyPairFactory>(
				Identifiers.Cryptography.Identity.KeyPairFactory,
				"type",
				"wallet",
			)
			.fromMnemonic(mnemonic);

		const consensusKeys: Contracts.Crypto.IKeyPair = await this.app
			.getTagged<Contracts.Crypto.IKeyPairFactory>(
				Identifiers.Cryptography.Identity.KeyPairFactory,
				"type",
				"consensus",
			)
			.fromMnemonic(mnemonic);

		return {
			address: await this.app
				.getTagged<Contracts.Crypto.IAddressFactory>(
					Identifiers.Cryptography.Identity.AddressFactory,
					"type",
					"wallet",
				)
				.fromPublicKey(keys.publicKey),
			consensusKeys,
			keys,
			passphrase: mnemonic,
			username: undefined,
		};
	}
}

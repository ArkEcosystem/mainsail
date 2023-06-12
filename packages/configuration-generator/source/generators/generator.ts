import { inject, injectable, tagged } from "@mainsail/container";
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

	@inject(Identifiers.Cryptography.Identity.PublicKeyFactory)
	@tagged("type", "consensus")
	private readonly publicKeyFactory!: Contracts.Crypto.IPublicKeyFactory;

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

		return {
			address: await this.app
				.getTagged<Contracts.Crypto.IAddressFactory>(
					Identifiers.Cryptography.Identity.AddressFactory,
					"type",
					"wallet",
				)
				.fromPublicKey(keys.publicKey),
			consenusPublicKey: await this.publicKeyFactory.fromMnemonic(mnemonic),
			keys,
			passphrase: mnemonic,
			username: undefined,
		};
	}
}

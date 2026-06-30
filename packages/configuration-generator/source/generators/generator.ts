import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { Application } from "@mainsail/kernel";

import { Wallet } from "../contracts.js";
import { Identifiers as InternalIdentifiers } from "../identifiers.js";
import { MnemonicGenerator } from "./mnemonic.js";

@injectable()
export class Generator {
	@inject(InternalIdentifiers.Application)
	protected app!: Application;

	@inject(InternalIdentifiers.Generator.Mnemonic)
	private mnemonicGenerator!: MnemonicGenerator;

	@tagged("type", "wallet")
	@inject(Identifiers.Cryptography.Identity.KeyPair.Factory)
	private keyPairFactoryWallet!: Contracts.Crypto.KeyPairFactory;

	@tagged("type", "consensus")
	@inject(Identifiers.Cryptography.Identity.KeyPair.Factory)
	private keyPairFactoryConsensus!: Contracts.Crypto.KeyPairFactory;

	@tagged("type", "wallet")
	@inject(Identifiers.Cryptography.Identity.Address.Factory)
	private addressFactoryWallet!: Contracts.Crypto.AddressFactory;

	protected async createWallet(mnemonic?: string): Promise<Wallet> {
		if (!mnemonic) {
			mnemonic = this.mnemonicGenerator.generate();
		}

		return {
			address: await this.addressFactoryWallet.fromMnemonic(mnemonic),
			consensusKeys: await this.keyPairFactoryConsensus.fromMnemonic(mnemonic),
			keys: await this.keyPairFactoryWallet.fromMnemonic(mnemonic),
			passphrase: mnemonic,
			username: undefined,
		};
	}
}

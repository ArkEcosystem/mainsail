import { Identities } from "@arkecosystem/crypto";
import Interfaces from "@arkecosystem/core-crypto-contracts";
import { generateMnemonic } from "bip39";

import { FactoryBuilder } from "../factory-builder";

export const registerIdentityFactory = (factory: FactoryBuilder): void => {
	factory.set("Identity", ({ options }) => {
		const passphrase: string = options.passphrase || generateMnemonic();

		const keys: Interfaces.IKeyPair = Identities.Keys.fromPassphrase(passphrase);

		return {
			keys,
			publicKey: keys.publicKey,
			privateKey: keys.privateKey,
			address: Identities.Address.fromPassphrase(passphrase, options.network?.pubKeyHash),
			wif: Identities.WIF.fromPassphrase(passphrase, options.network),
			passphrase,
		};
	});
};

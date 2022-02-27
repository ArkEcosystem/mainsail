// import Interfaces from "@arkecosystem/core-crypto-contracts";
// import { generateMnemonic } from "bip39";

import { FactoryBuilder } from "../factory-builder";

export const registerIdentityFactory = (factory: FactoryBuilder): void => {
	// factory.set("Identity", ({ options }) => {
	// 	const passphrase: string = options.passphrase || generateMnemonic();
	// 	const keys: Interfaces.IKeyPair = Identities.Keys.fromMnemonic(passphrase);
	// 	return {
	// 		address: this.addressFactory.fromMnemonic(passphrase, options.network?.pubKeyHash),
	// 		keys,
	// 		passphrase,
	// 		privateKey: keys.privateKey,
	// 		publicKey: keys.publicKey,
	// 		wif: Identities.WIF.fromMnemonic(passphrase, options.network),
	// 	};
	// });
};

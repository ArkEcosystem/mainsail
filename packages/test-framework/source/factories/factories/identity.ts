import { Contracts, Identifiers } from "@mainsail/contracts";
import { generateMnemonic } from "bip39";
import { join } from "path";

import { FactoryBuilder } from "../factory-builder";
import { generateApp } from "./generate-app";

export const registerIdentityFactory = async (
	factory: FactoryBuilder,
	config?: Contracts.Crypto.NetworkConfigPartial,
): Promise<void> => {
	const app = await generateApp(
		config ?? require(join(__dirname, "../../../../core/bin/config/testnet/core/crypto.json")),
	);

	factory.set("Identity", async ({ options }) => {
		const passphrase: string = options.passphrase || generateMnemonic();
		const keyType = options.keyType || "wallet";
		const application: Contracts.Kernel.Application = options.app || app;

		const keys = await application
			.getTagged<Contracts.Crypto.KeyPairFactory>(
				Identifiers.Cryptography.Identity.KeyPair.Factory,
				"type",
				keyType,
			)
			.fromMnemonic(passphrase);

		return {
			address: await application
				.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.Address.Factory)
				.fromMnemonic(passphrase),
			keys,
			passphrase,
			privateKey: keys.privateKey,
			publicKey: keys.publicKey,
			wif: await application
				.get<Contracts.Crypto.WIFFactory>(Identifiers.Cryptography.Identity.Wif.Factory)
				.fromMnemonic(passphrase),
		};
	});
};

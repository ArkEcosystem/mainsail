import { Contracts, Identifiers } from "@mainsail/contracts";
import { Wallets } from "@mainsail/state";
import { generateMnemonic } from "bip39";
import { join } from "path";

import { getAttributeRepository } from "../../internal/wallet-attributes";
import { FactoryBuilder } from "../factory-builder";
import { generateApp } from "./generate-app";

export const registerWalletFactory = async (
	factoryBuilder: FactoryBuilder,
	config?: Contracts.Crypto.NetworkConfigPartial,
): Promise<void> => {
	const app = await generateApp(
		config ?? require(join(__dirname, "../../../../core/bin/config/testnet/crypto.json")),
	);

	factoryBuilder.set("Wallet", async ({ options }) => {
		const passphrase: string = options.passphrase || generateMnemonic();

		const wallet: Wallets.Wallet = new Wallets.Wallet(
			await app
				.get<Contracts.Crypto.IAddressFactory>(Identifiers.Cryptography.Identity.AddressFactory)
				.fromMnemonic(passphrase),
			getAttributeRepository(),
		);
		wallet.setPublicKey(
			await app
				.getTagged<Contracts.Crypto.IPublicKeyFactory>(
					Identifiers.Cryptography.Identity.PublicKeyFactory,
					"type",
					"wallet",
				)
				.fromMnemonic(passphrase),
		);
		return wallet;
	});
};

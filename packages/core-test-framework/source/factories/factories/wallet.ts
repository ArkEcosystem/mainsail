import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Services } from "@arkecosystem/core-kernel";
import { Wallets } from "@arkecosystem/core-state";
import { generateMnemonic } from "bip39";
import { join } from "path";

import { getWalletAttributeSet } from "../../internal/wallet-attributes";
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
			new Services.Attributes.AttributeMap(getWalletAttributeSet()),
		);
		wallet.setPublicKey(
			await app
				.get<Contracts.Crypto.IPublicKeyFactory>(Identifiers.Cryptography.Identity.PublicKeyFactory)
				.fromMnemonic(passphrase),
		);
		return wallet;
	});
};

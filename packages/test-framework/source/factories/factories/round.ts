import { Contracts, Identifiers } from "@mainsail/contracts";
import { Wallets } from "@mainsail/state";
import { BigNumber } from "@mainsail/utils";
import { join } from "path";

import passphrases from "../../internal/passphrases.json";
import { knownAttributes } from "../../internal/wallet-attributes";
import { FactoryBuilder } from "../factory-builder";
import { generateApp } from "./generate-app";

export const registerRoundFactory = async (
	factory: FactoryBuilder,
	config?: Contracts.Crypto.NetworkConfigPartial,
): Promise<void> => {
	const app = await generateApp(
		config ?? require(join(__dirname, "../../../../core/bin/config/testnet/crypto.json")),
	);

	factory.set("Round", async ({ options }) => {
		const publicKeys: string[] =
			options.publicKeys ||
			(await Promise.all(
				passphrases.map(
					async (passphrase: string) =>
						await app
							.getTagged<Contracts.Crypto.IPublicKeyFactory>(
								Identifiers.Cryptography.Identity.PublicKeyFactory,
								"type",
								"wallet",
							)
							.fromMnemonic(passphrase),
				),
			));

		return Promise.all(
			publicKeys.map(async (publicKey: string, index: number) => {
				const wallet = new Wallets.Wallet(
					await app
						.get<Contracts.Crypto.IAddressFactory>(Identifiers.Cryptography.Identity.AddressFactory)
						.fromPublicKey(publicKey),
					knownAttributes,
				);
				wallet.setPublicKey(publicKey);
				// eslint-disable-next-line unicorn/no-useless-undefined
				wallet.setAttribute("validatorRank", undefined);
				wallet.setAttribute("validatorRound", options.round || 1);
				wallet.setAttribute("validatorUsername", `genesis_${index + 1}`);
				wallet.setAttribute("validatorVoteBalance", BigNumber.make("300000000000000"));
				return wallet;
			}),
		);
	});
};

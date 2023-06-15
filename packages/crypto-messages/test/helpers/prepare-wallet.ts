import { Contracts, Identifiers } from "@mainsail/contracts";

import validatorsJson from "../../../core/bin/config/testnet/validators.json";
import { Sandbox } from "../../../test-framework";

export const prepareWallet = async (context: { sandbox: Sandbox }): Promise<Contracts.State.Wallet> => {
	const walletRepository = context.sandbox.app.getTagged<Contracts.State.WalletRepository>(Identifiers.WalletRepository, "state", "blockchain");
	const consensusPublicKeyFactory = context.sandbox.app.getTagged<Contracts.Crypto.IPublicKeyFactory>(
		Identifiers.Cryptography.Identity.PublicKeyFactory,
		"type",
		"consensus",
	);

	const mnemonic = validatorsJson.secrets[0];
	const wallet = walletRepository.findByAddress(mnemonic);
	wallet.setAttribute("consensus.publicKey", await consensusPublicKeyFactory.fromMnemonic(mnemonic));

	return wallet;
};


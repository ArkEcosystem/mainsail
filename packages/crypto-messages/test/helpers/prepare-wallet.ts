import { Contracts, Identifiers } from "@mainsail/contracts";

import { Wallets } from "../../../state";
import { Sandbox } from "../../../test-framework";
import { validatorMnemonic } from "../fixtures/proposal";

export const prepareWallet = async (context: { sandbox: Sandbox }): Promise<Contracts.Consensus.IValidatorWallet> => {
	const walletRepository = context.sandbox.app
		.get<Contracts.State.Service>(Identifiers.StateService)
		.getWalletRepository();
	const consensusPublicKeyFactory = context.sandbox.app.getTagged<Contracts.Crypto.IPublicKeyFactory>(
		Identifiers.Cryptography.Identity.PublicKeyFactory,
		"type",
		"consensus",
	);

	const mnemonic = validatorMnemonic;
	const wallet = walletRepository.findByAddress(mnemonic);
	wallet.setAttribute("validatorConsensusPublicKey", await consensusPublicKeyFactory.fromMnemonic(mnemonic));

	return new Wallets.ValidatorWallet(wallet);
};

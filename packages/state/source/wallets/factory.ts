import { Contracts } from "@mainsail/contracts";

import { ValidatorWallet } from "./validator-wallet";
import { Wallet } from "./wallet";

export const walletFactory =
	(attributeRepository: Contracts.State.IAttributeRepository) =>
	(address: string, walletRepository: Contracts.State.WalletRepository) =>
		new Wallet(address, attributeRepository, walletRepository);

export const validatorWalletFactory = (wallet: Contracts.State.Wallet) => new ValidatorWallet(wallet);

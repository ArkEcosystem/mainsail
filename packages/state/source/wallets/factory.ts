import { Contracts } from "@mainsail/contracts";

import { ValidatorWallet } from "./validator-wallet.js";
import { Wallet } from "./wallet.js";

export const walletFactory =
	(attributeRepository: Contracts.State.AttributeRepository) =>
	(address: string, walletRepository: Contracts.State.WalletRepository) =>
		new Wallet(address, attributeRepository, walletRepository);

export const validatorWalletFactory = (wallet: Contracts.State.Wallet) => new ValidatorWallet(wallet);

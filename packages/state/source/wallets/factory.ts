import { Contracts } from "@mainsail/contracts";

import { ValidatorWallet } from "./validator-wallet.js";
import { Wallet } from "./wallet.js";

export const walletFactory =
	({ container }) =>
	(address: string, walletRepository: Contracts.State.WalletRepository, originalWallet?: Wallet) =>
		container.resolve(Wallet).init(address, walletRepository, originalWallet);

export const validatorWalletFactory = (wallet: Contracts.State.Wallet) => new ValidatorWallet(wallet);

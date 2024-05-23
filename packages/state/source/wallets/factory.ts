import { Contracts } from "@mainsail/contracts";

import { ValidatorWallet } from "./validator-wallet.js";
import { Wallet } from "./wallet.js";

export const walletFactory =
	(app: Contracts.Kernel.Application) =>
	(address: string, walletRepository: Contracts.State.WalletRepository, originalWallet?: Wallet) => {
		const wallet = app.resolve(Wallet);

		wallet.init(address, walletRepository, originalWallet);

		return wallet;
	};

export const validatorWalletFactory = (wallet: Contracts.State.Wallet) => new ValidatorWallet(wallet);

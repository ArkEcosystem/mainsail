import { Contracts } from "@mainsail/contracts";

import { Wallet } from "./wallet.js";

export const walletFactory =
	({ container }) =>
	(address: string, walletRepository: Contracts.State.WalletRepository, originalWallet?: Wallet) =>
		container.resolve(Wallet).init(address, walletRepository, originalWallet);

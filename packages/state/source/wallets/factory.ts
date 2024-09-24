
import { Wallet } from "./wallet.js";

export const walletFactory =
	({ container }) =>
	(address: string, walletRepository: any, originalWallet?: Wallet) =>
		container.resolve(Wallet).init(address, walletRepository, originalWallet);

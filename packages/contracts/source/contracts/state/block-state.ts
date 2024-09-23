import { Block, TransactionData } from "../crypto/index.js";
import { Wallet, WalletRepository } from "./wallets.js";

export interface BlockState {
	applyBlock(walletRepository: WalletRepository, block: Block): Promise<void>;
}

export interface VoteBalanceMutator {
	apply(
		walletRepository: WalletRepository,
		sender: Wallet,
		recipient: Wallet,
		transaction: TransactionData,
	): Promise<void>;
}

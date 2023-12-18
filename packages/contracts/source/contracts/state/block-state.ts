import { Block, BlockData, TransactionData } from "../crypto";
import { Wallet, WalletRepository } from "./wallets";

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

export interface ValidatorMutator {
	apply(walletRepository: WalletRepository, wallet: Wallet, block: BlockData): Promise<void>;
}

import { IBlock, IBlockData, ITransaction, ITransactionData } from "../crypto";
import { Wallet, WalletRepository } from "./wallets";

export interface BlockState {
	applyBlock(block: IBlock): Promise<void>;

	applyTransaction(transaction: ITransaction): Promise<void>;

	revertTransaction(transaction: ITransaction): Promise<void>;
}

export interface VoteBalanceMutator {
	apply(
		walletRepository: WalletRepository,
		sender: Wallet,
		recipient: Wallet,
		transaction: ITransactionData,
	): Promise<void>;

	revert(
		walletRepository: WalletRepository,
		sender: Wallet,
		recipient: Wallet,
		transaction: ITransactionData,
	): Promise<void>;
}

export interface ValidatorMutator {
	apply(walletRepository: WalletRepository, wallet: Wallet, block: IBlockData): Promise<void>;

	revert(walletRepository: WalletRepository, wallet: Wallet, block: IBlockData): Promise<void>;
}

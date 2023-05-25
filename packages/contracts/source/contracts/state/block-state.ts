import { IBlock, IBlockData, ITransactionData } from "../crypto";
import { Wallet, WalletRepository } from "./wallets";

export interface BlockState {
	applyBlock(walletRepository: WalletRepository, block: IBlock): Promise<void>;
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

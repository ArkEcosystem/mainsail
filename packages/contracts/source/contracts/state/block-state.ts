import { IBlock, IBlockData, ITransaction, ITransactionData } from "../crypto";
import { Wallet } from "./wallets";

export interface BlockState {
	applyBlock(block: IBlock): Promise<void>;

	revertBlock(block: IBlock): Promise<void>;

	applyTransaction(transaction: ITransaction): Promise<void>;

	revertTransaction(transaction: ITransaction): Promise<void>;
}

export interface VoteBalanceMutator {
	apply(sender: Wallet, recipient: Wallet, transaction: ITransactionData): Promise<void>;

	revert(sender: Wallet, recipient: Wallet, transaction: ITransactionData): Promise<void>;
}

export interface ValidatorMutator {
	apply(wallet: Wallet, block: IBlockData): Promise<void>;

	revert(wallet: Wallet, block: IBlockData): Promise<void>;
}

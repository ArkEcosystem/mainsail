import { BigNumber } from "@arkecosystem/utils";

import { IBlock, ITransaction } from "../crypto";
import { Wallet } from "./wallets";

export interface BlockState {
	applyBlock(block: IBlock): Promise<void>;

	revertBlock(block: IBlock): Promise<void>;

	applyTransaction(transaction: ITransaction): Promise<void>;

	revertTransaction(transaction: ITransaction): Promise<void>;

	increaseWalletDelegateVoteBalance(wallet: Wallet, amount: BigNumber): void;

	decreaseWalletDelegateVoteBalance(wallet: Wallet, amount: BigNumber): void;
}

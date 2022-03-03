import { BigNumber } from "@arkecosystem/utils";

import { IBlock, ITransaction } from "../crypto";
import { Wallet } from "./wallets";

export interface BlockState {
	applyBlock(block: IBlock): Promise<void>;

	revertBlock(block: IBlock): Promise<void>;

	applyTransaction(transaction: ITransaction): Promise<void>;

	revertTransaction(transaction: ITransaction): Promise<void>;

	increaseWalletValidatorVoteBalance(wallet: Wallet, amount: BigNumber): void;

	decreaseWalletValidatorVoteBalance(wallet: Wallet, amount: BigNumber): void;
}

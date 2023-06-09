import { BigNumber } from "@mainsail/utils";

import { IBlock, IBlockData, ICommittedBlock, ITransaction } from "./crypto";
import { Wallet } from "./state";

export interface IRound {
	publicKey: string;
	round: number;
	balance: BigNumber;
}

export interface IDatabaseService {
	getBlock(id: string): Promise<IBlock | undefined>;

	findCommittedBlocks(start: number, end: number): Promise<Buffer[]>;

	findBlocksByHeightRange(start: number, end: number): Promise<IBlock[]>;

	getBlocks(start: number, end: number): Promise<IBlockData[]>;

	findBlockByHeights(heights: number[]): Promise<IBlock[]>;

	getLastBlock(): Promise<IBlock | undefined>;

	getTransaction(id: string): Promise<ITransaction | undefined>;

	saveBlocks(blocks: ICommittedBlock[]): Promise<void>;

	findBlocksByIds(ids: string[]): Promise<IBlockData[]>;

	getRound(round: number): Promise<IRound[]>;

	saveRound(activeValidators: readonly Wallet[]): Promise<void>;

	deleteRound(round: number): Promise<void>;

	getForgedTransactionsIds(ids: string[]): Promise<string[]>;

	verifyBlockchain(): Promise<boolean>;
}

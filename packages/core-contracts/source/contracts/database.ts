import { BigNumber } from "@arkecosystem/utils";

import { IBlock, IBlockData, ITransaction } from "./crypto";
import { DownloadBlock } from "./shared";
import { Wallet } from "./state";

export interface IRound {
	publicKey: string;
	round: number;
	balance: BigNumber;
}

export interface IDatabaseService {
	getBlock(id: string): Promise<IBlock | undefined>;

	findBlocksByHeightRange(start: number, end: number): Promise<IBlock[]>;

	getBlocks(start: number, end: number): Promise<IBlockData[]>;

	getBlocksForDownload(offset: number, limit: number): Promise<DownloadBlock[]>;

	findBlockByHeights(heights: number[]): Promise<IBlock[]>;

	getLastBlock(): Promise<IBlock | undefined>;

	getTransaction(id: string): Promise<ITransaction | undefined>;

	saveBlocks(blocks: IBlock[]): Promise<void>;

	findBlocksByIds(ids: string[]): Promise<IBlockData[]>;

	getRound(round: number): Promise<IRound[]>;

	saveRound(activeValidators: readonly Wallet[]): Promise<void>;

	deleteRound(round: number): Promise<void>;

	getForgedTransactionsIds(ids: string[]): Promise<string[]>;

	verifyBlockchain(): Promise<boolean>;
}

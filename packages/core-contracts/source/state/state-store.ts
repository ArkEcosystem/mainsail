import { IBlock, IBlockData, ITransactionData } from "../crypto";

export interface BlockPing {
	count: number;
	first: number;
	last: number;
	fromForger: boolean;
	block: IBlockData;
}

export interface StateStore {
	getBlockchain(): any;

	setBlockchain(blockchain: any): void;

	getGenesisBlock(): IBlock;

	setGenesisBlock(block: IBlock): void;

	getLastDownloadedBlock(): IBlockData | undefined;

	setLastDownloadedBlock(block: IBlockData): void;

	getLastStoredBlockHeight(): number;

	setLastStoredBlockHeight(height: number): void;

	getBlockPing(): BlockPing | undefined;

	isStarted(): boolean;

	setStarted(started: boolean): void;

	getForkedBlock(): IBlock | undefined;

	setForkedBlock(block: IBlock): void;

	clearForkedBlock(): void;

	getNoBlockCounter(): number;

	setNoBlockCounter(noBlockCounter: number): void;

	getP2pUpdateCounter(): number;

	setP2pUpdateCounter(p2pUpdateCounter: number): void;

	getNumberOfBlocksToRollback(): number;

	setNumberOfBlocksToRollback(numberOfBlocksToRollback: number): void;

	getNetworkStart(): boolean;

	setNetworkStart(networkStart: boolean): void;

	getRestoredDatabaseIntegrity(): boolean;

	setRestoredDatabaseIntegrity(restoredDatabaseIntegrity: boolean): void;

	reset(blockchainMachine): void;

	isWakeUpTimeoutSet(): boolean;

	setWakeUpTimeout(callback: Function, timeout: number): void;

	clearWakeUpTimeout(): void;

	getMaxLastBlocks(): number;

	getLastHeight(): number;

	getLastBlock(): IBlock;

	setLastBlock(block: IBlock): void;

	getLastBlocks(): IBlock[];

	getLastBlockIds(): string[];

	getLastBlocksByHeight(start: number, end?: number, headersOnly?: boolean): IBlockData[];

	getCommonBlocks(ids: string[]): IBlockData[];

	cacheTransactions(transactions: ITransactionData[]): {
		[key in "added" | "notAdded"]: ITransactionData[];
	};

	clearCachedTransactionIds(): void;

	getCachedTransactionIds(): string[];

	pingBlock(incomingBlock: IBlockData): boolean;

	pushPingBlock(block: IBlockData, fromForger?: boolean): void;
}

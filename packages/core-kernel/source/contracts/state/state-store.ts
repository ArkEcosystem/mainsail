import Interfaces from "@arkecosystem/core-crypto-contracts";

export interface BlockPing {
	count: number;
	first: number;
	last: number;
	fromForger: boolean;
	block: Interfaces.IBlockData;
}

export interface StateStore {
	getBlockchain(): any;

	setBlockchain(blockchain: any): void;

	getGenesisBlock(): Interfaces.IBlock;

	setGenesisBlock(block: Interfaces.IBlock): void;

	getLastDownloadedBlock(): Interfaces.IBlockData | undefined;

	setLastDownloadedBlock(block: Interfaces.IBlockData): void;

	getLastStoredBlockHeight(): number;

	setLastStoredBlockHeight(height: number): void;

	getBlockPing(): BlockPing | undefined;

	isStarted(): boolean;

	setStarted(started: boolean): void;

	getForkedBlock(): Interfaces.IBlock | undefined;

	setForkedBlock(block: Interfaces.IBlock): void;

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

	getLastBlock(): Interfaces.IBlock;

	setLastBlock(block: Interfaces.IBlock): void;

	getLastBlocks(): Interfaces.IBlock[];

	getLastBlockIds(): string[];

	getLastBlocksByHeight(start: number, end?: number, headersOnly?: boolean): Interfaces.IBlockData[];

	getCommonBlocks(ids: string[]): Interfaces.IBlockData[];

	cacheTransactions(transactions: Interfaces.ITransactionData[]): {
		[key in "added" | "notAdded"]: Interfaces.ITransactionData[];
	};

	clearCachedTransactionIds(): void;

	getCachedTransactionIds(): string[];

	pingBlock(incomingBlock: Interfaces.IBlockData): boolean;

	pushPingBlock(block: Interfaces.IBlockData, fromForger?: boolean): void;
}

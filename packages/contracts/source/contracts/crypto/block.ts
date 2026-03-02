import type { BigNumber } from "@mainsail/utils";

import type { BlockHeaderStorageData, TransactionStorageData } from "../evm/storage.js";
import type {
	BlockTransaction,
	Transaction,
	TransactionJson,
	TransactionJsonCrypto,
	TransactionSerializable,
} from "./transactions.js";

export type BlockTag = "latest" | "finalized" | "safe";

export interface BlockHeaderRaw {
	readonly version: number;
	readonly timestamp: number;
	readonly number: number;
	readonly round: number;
	readonly parentHash: string;
	readonly stateRoot: string;
	readonly logsBloom: string;
	readonly transactionsCount: number;
	readonly gasUsed: number;
	readonly fee: BigNumber;
	readonly reward: BigNumber;
	readonly payloadSize: number;
	readonly transactionsRoot: string;
	readonly proposer: string;
}

export type BlockHeader = BlockHeaderRaw & {
	readonly hash: string;
};

export type BlockData = BlockHeader & {
	readonly transactions: TransactionSerializable[];
};

export interface Block extends BlockHeader {
	readonly serialized: string;
	readonly transactions: BlockTransaction[];

	toData(): BlockData;
}

export interface BlockJson {
	readonly hash: string;

	readonly timestamp: number;
	readonly version: number;
	readonly number: number;
	readonly round: number;
	readonly parentHash: string;
	readonly stateRoot: string;
	readonly logsBloom: string;
	readonly transactionsCount: number;
	readonly gasUsed: number;
	readonly fee: string;
	readonly reward: string;
	readonly payloadSize: number;
	readonly transactionsRoot: string;
	readonly proposer: string;

	readonly serialized?: string;
	readonly transactions: TransactionJson[];
}

export interface BlockJsonCrypto extends BlockJson {
	readonly transactions: TransactionJsonCrypto[];
}

export interface BlockFactory {
	make(data: BlockHeaderRaw, transactions: Transaction[]): Promise<Block>;

	fromHex(hex: string): Promise<Block>;
	fromBytes(buff: Buffer): Promise<Block>;
	fromJson(json: BlockJson): Promise<Block>;
	fromStorage(header: BlockHeaderStorageData, transactions: TransactionStorageData[]): Promise<Block>;
	headerFromStorage(header: BlockHeaderStorageData): Promise<BlockHeader>;
}

export type BlockSerializable = BlockHeaderRaw & {
	readonly transactions: { serialized: Buffer }[];
};

export interface BlockSerializer {
	totalSize(block: BlockHeaderRaw): number;

	serializeHeader(block: BlockHeaderRaw): Promise<Buffer>;

	serializeWithTransactions(block: BlockSerializable): Promise<Buffer>;
}

export interface BlockWithTransactions {
	data: BlockHeader;
	transactions: Transaction[];
}

export interface BlockDeserializer {
	deserializeHeader(serialized: Buffer): Promise<BlockHeader>;

	deserializeWithTransactions(serialized: Buffer): Promise<BlockWithTransactions>;
}

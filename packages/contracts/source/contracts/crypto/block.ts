import type { BigNumber } from "@mainsail/utils";

import type { BlockHeaderStorageData, TransactionStorageData } from "../evm/storage.js";
import type { Transaction, TransactionData, TransactionJson } from "./transactions.js";

export type BlockTag = "latest" | "finalized" | "safe";

export interface BlockHeaderRaw {
	readonly timestamp: number;
	readonly version: number;
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
}

export type BlockData = BlockHeader & {
	readonly transactions: TransactionData[];
}

export interface Block {
	readonly data: BlockData;
	readonly header: BlockHeader;
	readonly serialized: string;
	readonly transactions: Transaction[];
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

export type BlockDataSerializable = Omit<BlockData, "hash">;

export interface BlockFactory {
	make(data: BlockDataSerializable, transactions: Transaction[]): Promise<Block>;

	fromHex(hex: string): Promise<Block>;
	fromBytes(buff: Buffer): Promise<Block>;
	fromJson(json: BlockJson): Promise<Block>;
	fromData(data: BlockData): Promise<Block>;
	fromStorage(header: BlockHeaderStorageData, transactions: TransactionStorageData[]): Promise<Block>;
}

export interface BlockSerializer {
	totalSize(block: BlockDataSerializable): number;

	serializeHeader(block: BlockHeaderRaw): Promise<Buffer>;

	serializeWithTransactions(block: BlockDataSerializable): Promise<Buffer>;
}

export interface BlockWithTransactions {
	data: BlockData;
	transactions: Transaction[];
}

export interface BlockDeserializer {
	deserializeHeader(serialized: Buffer): Promise<BlockHeader>;

	deserializeWithTransactions(serialized: Buffer): Promise<BlockWithTransactions>;
}

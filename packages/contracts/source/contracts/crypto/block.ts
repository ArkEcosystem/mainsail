import { BigNumber } from "@mainsail/utils";

import { Mutable } from "../../utilities.js";
import { Transaction, TransactionData, TransactionJson } from "./transactions.js";

export type BlockTag = "latest" | "finalized" | "safe";
export type BlockHeader = Exclude<BlockData, "transactions">;

export interface Block {
	readonly data: BlockData;
	readonly header: BlockHeader;
	readonly serialized: string;
	readonly transactions: Transaction[];
}

export interface BlockData {
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
	readonly amount: BigNumber;
	readonly fee: BigNumber;
	readonly reward: BigNumber;
	readonly payloadSize: number;
	readonly transactionsRoot: string;
	readonly proposer: string;

	// TODO: transactions field is missing when retrieved from storage
	// and transactionsCount = 0
	readonly transactions: TransactionData[];
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
	readonly amount: string;
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
	make(data: Mutable<BlockDataSerializable>, transactions: Transaction[]): Promise<Block>;

	fromHex(hex: string): Promise<Block>;
	fromBytes(buff: Buffer): Promise<Block>;
	fromJson(json: BlockJson): Promise<Block>;
	fromData(data: BlockData): Promise<Block>;
}

export interface BlockSerializer {
	totalSize(block: BlockDataSerializable): number;

	serializeHeader(block: BlockDataSerializable): Promise<Buffer>;

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

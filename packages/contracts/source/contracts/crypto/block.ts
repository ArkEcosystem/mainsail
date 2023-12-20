import { BigNumber } from "@mainsail/utils";

import { Mutable } from "../../utils";
import { Transaction, TransactionData, TransactionJson } from "./transactions";

export interface BlockVerification {
	readonly verified: boolean;
	readonly errors: string[];
	readonly containsMultiSignatures: boolean;
}

export type BlockHeader = Exclude<BlockData, "transactions">;

export interface Block {
	readonly data: BlockData;
	readonly header: BlockHeader;
	readonly serialized: string;
	readonly transactions: Transaction[];
}

export interface BlockData {
	readonly id: string;

	readonly timestamp: number;
	readonly version: number;
	readonly height: number;
	readonly previousBlock: string;
	readonly numberOfTransactions: number;
	readonly totalAmount: BigNumber;
	readonly totalFee: BigNumber;
	readonly reward: BigNumber;
	readonly payloadLength: number;
	readonly payloadHash: string;
	readonly generatorPublicKey: string;

	// TODO: transactions field is missing when retrieved from storage
	// and numberOfTransactions = 0
	readonly transactions: TransactionData[];
}

export interface BlockJson {
	readonly id: string;

	readonly timestamp: number;
	readonly version: number;
	readonly height: number;
	readonly previousBlock: string;
	readonly numberOfTransactions: number;
	readonly totalAmount: string;
	readonly totalFee: string;
	readonly reward: string;
	readonly payloadLength: number;
	readonly payloadHash: string;
	readonly generatorPublicKey: string;

	readonly serialized?: string;
	readonly transactions: TransactionJson[];
}


export type BlockDataSerializable = Omit<BlockData, "id">;

export interface BlockFactory {
	make(data: Mutable<BlockDataSerializable>): Promise<Block>;

	fromHex(hex: string): Promise<Block>;

	fromBytes(buff: Buffer): Promise<Block>;

	fromJson(json: BlockJson): Promise<Block>;

	fromData(data: BlockData): Promise<Block>;
}

export interface BlockSerializer {
	headerSize(): number;

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

export interface BlockVerifier {
	verify(block: Block): Promise<BlockVerification>;
}

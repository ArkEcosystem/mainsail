import { BigNumber } from "@mainsail/utils";

import { ITransaction, ITransactionData, ITransactionJson } from "./transactions";
import { Mutable } from "../../utils";

export interface IBlockVerification {
	readonly verified: boolean;
	readonly errors: string[];
	readonly containsMultiSignatures: boolean;
}

export type IBlockHeader = Exclude<IBlockData, "transactions">;

export interface IBlock {
	readonly data: IBlockData;
	readonly header: IBlockHeader;
	readonly serialized: string;
	readonly transactions: ITransaction[];
}

export interface IBlockData {
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

	readonly transactions: ITransactionData[];
}

export interface IBlockJson {
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
	readonly transactions: ITransactionJson[];
}

export type IBlockDataSerializable = Omit<IBlockData, "id">;

export interface IBlockFactory {
	make(data: Mutable<IBlockDataSerializable>): Promise<IBlock>;

	fromHex(hex: string): Promise<IBlock>;

	fromBytes(buff: Buffer): Promise<IBlock>;

	fromJson(json: IBlockJson): Promise<IBlock>;

	fromData(data: IBlockData): Promise<IBlock>;
}

export interface IBlockSerializer {
	headerSize(): number;
	totalSize(block: IBlockDataSerializable): number;

	serializeHeader(block: IBlockDataSerializable): Promise<Buffer>;

	serializeWithTransactions(block: IBlockDataSerializable): Promise<Buffer>;
}

export interface IBlockWithTransactions {
	data: IBlockData;
	transactions: ITransaction[];
}

export interface IBlockDeserializer {
	deserializeHeader(serialized: Buffer): Promise<IBlockHeader>;
	deserializeWithTransactions(serialized: Buffer): Promise<IBlockWithTransactions>;
}

export interface IBlockVerifier {
	verify(block: IBlock): Promise<IBlockVerification>;
}

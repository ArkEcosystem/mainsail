import { BigNumber } from "@mainsail/utils";

import { IKeyPair } from "./identities";
import { ITransaction, ITransactionData, ITransactionJson } from "./transactions";

export interface IBlockVerification {
	verified: boolean;
	errors: string[];
	containsMultiSignatures: boolean;
}

export interface IBlock {
	data: IBlockData;
	header: Exclude<IBlockData, "transactions">;
	serialized: string;
	transactions: ITransaction[];
}

export interface IBlockData {
	id?: string;

	timestamp: number;
	version: number;
	height: number;
	previousBlock: string;
	numberOfTransactions: number;
	totalAmount: BigNumber;
	totalFee: BigNumber;
	reward: BigNumber;
	payloadLength: number;
	payloadHash: string;
	generatorPublicKey: string;

	serialized?: string;
	transactions?: ITransactionData[];
}

export interface IBlockJson {
	id?: string;

	timestamp: number;
	version: number;
	height: number;
	previousBlock: string;
	numberOfTransactions: number;
	totalAmount: string;
	totalFee: string;
	reward: string;
	payloadLength: number;
	payloadHash: string;
	generatorPublicKey: string;

	serialized?: string;
	transactions?: ITransactionJson[];
}

export interface IBlockDeserializer {
	deserialize(serialized: Buffer, headerOnly?: boolean): Promise<{ data: IBlockData; transactions: ITransaction[] }>;
}

export interface IBlockFactory {
	make(data: any, keys: IKeyPair): Promise<IBlock | undefined>;

	fromHex(hex: string): Promise<IBlock>;

	fromBytes(buff: Buffer): Promise<IBlock>;

	fromJson(json: IBlockJson): Promise<IBlock | undefined>;

	fromData(data: IBlockData): Promise<IBlock | undefined>;
}

export interface IBlockSerializer {
	size(block: IBlock): number;

	serialize(block: IBlockData, includeSignature?: boolean): Promise<Buffer>;

	serializeWithTransactions(block: IBlockData): Promise<Buffer>;
}

export interface IBlockVerifier {
	verify(block: IBlock): Promise<IBlockVerification>;

	verifySignature(block: IBlock): Promise<boolean>;
}

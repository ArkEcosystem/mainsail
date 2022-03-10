import { BigNumber } from "@arkecosystem/utils";

import { IKeyPair } from "./identities";
import { ITransaction, ITransactionData, ITransactionJson } from "./transactions";

export interface IBlockVerification {
	verified: boolean;
	errors: string[];
	containsMultiSignatures: boolean;
}

export interface IBlock {
	serialized: string;
	data: IBlockData;
	transactions: ITransaction[];
	verification: IBlockVerification;

	getHeader(): IBlockData;
	verifySignature(): Promise<boolean>;
	verify(): Promise<IBlockVerification>;

	toString(): string;
	toJson(): IBlockJson;
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

	blockSignature?: string;
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

	blockSignature?: string;
	serialized?: string;
	transactions?: ITransactionJson[];
}

export interface IBlockDeserializer {
	deserialize(
		serialized: Buffer,
		headerOnly?: boolean,
		options?: { deserializeTransactionsUnchecked?: boolean },
	): Promise<{ data: IBlockData; transactions: ITransaction[] }>;
}

export interface IBlockFactory {
	make(data: any, keys: IKeyPair): Promise<IBlock | undefined>;

	fromHex(hex: string): Promise<IBlock>;

	fromBytes(buff: Buffer): Promise<IBlock>;

	fromJson(json: IBlockJson): Promise<IBlock | undefined>;

	fromData(data: IBlockData, options?: { deserializeTransactionsUnchecked?: boolean }): Promise<IBlock | undefined>;
}

export interface IBlockSerializer {
	size(block: IBlock): number;

	serialize(block: IBlockData, includeSignature?: boolean): Promise<Buffer>;

	serializeWithTransactions(block: IBlockData): Promise<Buffer>;
}

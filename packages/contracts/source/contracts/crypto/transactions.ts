import { BigNumber } from "@mainsail/utils";

import type { EcdsaSignature, KeyPair } from "./identities.js";
import type { SchemaValidationResult } from "./validator.js";
import { TransactionStorageData } from "../evm/storage.js";

export interface Transaction {
	readonly hash: string;

	data: TransactionData;
	serialized: Buffer;
}

export type TransactionSchema = Record<string, any>;

export interface TransactionData {
	network: number;

	from: string;
	senderLegacyAddress?: string;
	senderPublicKey: string;
	to?: string;

	value: BigNumber;

	gasPrice: number;
	gasLimit: number;

	nonce: BigNumber;
	data: string;

	hash: string;

	v?: number;
	r?: string;
	s?: string;
	legacySecondSignature?: string;

	transactionIndex?: number;
	gasUsed?: number;
	blockHash?: string;
	blockNumber?: number;
}

export interface TransactionJson {
	network?: number;

	from: string;
	senderPublicKey: string;
	to?: string;

	value: string;

	gasLimit: number;
	gasPrice: number;

	nonce: string;
	data: string;

	hash?: string;

	v?: number;
	r?: string;
	s?: string;

	transactionIndex?: number;
	gasUsed?: number;
	blockHash?: string;
	blockNumber?: number;
}

export interface SerializeOptions {
	excludeSignature?: boolean;
	// TODO: consider passing pre-allocated buffer
}

export interface TransactionCryptoData {
	readonly hash: string;
	readonly publicKey: string;
	readonly address: string;
	readonly legacyAddress?: string;
	readonly schemaError?: any;
}

export interface TransactionServiceProvider {
	register(): Promise<void>;
}

export interface TransactionVerifier {
	verifyHash(data: TransactionData): Promise<boolean>;

	verifySchema(data: Omit<TransactionData, "hash">, strict?: boolean): Promise<SchemaValidationResult>;

	verifyLegacySecondSignature(data: TransactionData, legacySecondPublicKey: string): Promise<boolean>;
}

export interface TransactionSigner {
	sign(transaction: TransactionData, keys: KeyPair, options?: SerializeOptions): Promise<EcdsaSignature>;
	legacySecondSign(transaction: TransactionData, keys: KeyPair, options?: SerializeOptions): Promise<string>;
}

export interface TransactionSerializer {
	serialize(transaction: Transaction, options?: SerializeOptions): Promise<Buffer>;
}

export interface TransactionDeserializer {
	deserialize(serialized: Buffer): Promise<Transaction>;
}

export interface TransactionFactory {
	fromHex(hex: string): Promise<Transaction>;

	fromBytes(buff: Buffer, strict?: boolean): Promise<Transaction>;

	fromJson(json: TransactionJson): Promise<Transaction>;

	fromData(data: TransactionData, strict?: boolean): Promise<Transaction>;

	fromStorage(data: TransactionStorageData): Promise<Transaction>;

	computeCryptoData(data: TransactionData): Promise<TransactionCryptoData>;
}

export type TransactionConstructor = any;

export interface TransactionRegistry {
	registerTransactionType(constructor: TransactionConstructor): void;

	deregisterTransactionType(constructor: TransactionConstructor): void;
}

export interface TransactionUtilities {
	resolve(data: TransactionData): Transaction;

	toBytes(data: TransactionData): Promise<Buffer>;

	toHash(transaction: TransactionData, options?: SerializeOptions): Promise<Buffer>;

	getHash(transaction: Transaction): Promise<string>;
}

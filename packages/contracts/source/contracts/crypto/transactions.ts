import type { BigNumber } from "@mainsail/utils";

import type { TransactionStorageData } from "../evm/storage.js";
import type { EcdsaSignature, KeyPair } from "./identities.js";
import type { SchemaValidationResult } from "./validator.js";

export interface TransactionUnsignedSerializable {
	network: number;

	to?: string;
	value: BigNumber;

	gasPrice: number;
	gasLimit: number;
	nonce: BigNumber;
	data: string;
}

export interface TransactionSerializable extends TransactionUnsignedSerializable {
	v: number;
	r: string;
	s: string;

	legacySecondSignature?: string;
}

export interface TransactionCryptoData {
	readonly hash: string;
	readonly from: string;
	readonly senderPublicKey: string;
	readonly senderLegacyAddress?: string;
}

export interface TransactionData extends TransactionSerializable, TransactionCryptoData {}

export interface Transaction extends TransactionData {
	serialized: Buffer;
	toData(): TransactionData;
}

export interface BlockTransaction extends Transaction {
	transactionIndex: number;
	blockHash: string;
	blockNumber: number;
}

export interface TransactionStorageDataExtended extends TransactionStorageData {
	blockHash: string;
}

export interface TransactionJson {
	hash: string;
	network: number;

	from: string;
	senderPublicKey: string;
	to?: string;

	value: string;

	gasLimit: number;
	gasPrice: number;
	nonce: string;
	data: string;

	v: number;
	r: string;
	s: string;

	transactionIndex?: number;
	blockHash?: string;
	blockNumber?: number;
}

export interface SerializeOptions {
	excludeSignature: boolean;
}

export interface TransactionVerifier {
	verifyHash(data: TransactionData): Promise<boolean>;
	verifySchema(
		data: Omit<TransactionData, "hash">,
		strict?: boolean,
	): Promise<SchemaValidationResult<TransactionData>>;
	verifyLegacySecondSignature(data: TransactionData, legacySecondPublicKey: string): Promise<boolean>;
}

export interface TransactionSigner {
	sign(transaction: TransactionData, keys: KeyPair, options?: SerializeOptions): Promise<EcdsaSignature>;
	legacySecondSign(transaction: TransactionData, keys: KeyPair, options?: SerializeOptions): Promise<string>;
}

export interface TransactionSerializer {
	serialize(transaction: TransactionData, options?: SerializeOptions): Promise<Buffer>;
}

export interface TransactionDeserializer {
	deserialize(serialized: Buffer): Promise<{ data: TransactionSerializable; serialized: Buffer }>;
}

export interface TransactionFactory {
	fromHex(hex: string): Promise<Transaction>;
	fromBytes(buff: Buffer, strict?: boolean): Promise<Transaction>;
	fromJson(json: TransactionJson): Promise<Transaction>;
	fromData(data: TransactionData, strict?: boolean): Promise<Transaction>;
	fromStorage(data: TransactionStorageDataExtended): Promise<BlockTransaction>;
}

export interface TransactionUtilities {
	toHash(transaction: TransactionSerializable, options?: SerializeOptions): Promise<Buffer>;
}

export type TransactionSchema = Record<string, unknown>;

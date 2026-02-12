import type { BigNumber } from "@mainsail/utils";

import type { TransactionStorageData } from "../evm/storage.js";
import type { EcdsaSignature, KeyPair } from "./identities.js";
import type { SchemaValidationResult } from "./validator.js";

export interface TransactionUnsignedSerializable {
	readonly network: number;

	readonly to?: string;
	readonly value: BigNumber;

	readonly gasPrice: number;
	readonly gasLimit: number;
	readonly nonce: BigNumber;
	readonly data: string;
}

export interface TransactionSerializable extends TransactionUnsignedSerializable {
	readonly v: number;
	readonly r: string;
	readonly s: string;

	readonly legacySecondSignature?: string;
}

export interface TransactionCryptoData {
	readonly hash: string;
	readonly from: string;
	readonly senderPublicKey: string;
	readonly senderLegacyAddress: string;
}

export interface TransactionData extends TransactionSerializable, TransactionCryptoData {}

export interface Transaction extends TransactionData {
	readonly serialized: Buffer;
	toData(): TransactionData;
}

export interface BlockTransaction extends Transaction {
	readonly transactionIndex: number;
	readonly blockHash: string;
	readonly blockNumber: number;
}

export interface TransactionStorageDataExtended extends TransactionStorageData {
	readonly blockHash: string;
}

export interface TransactionJson {
	readonly hash: string;
	readonly network: number;

	readonly from: string;
	readonly senderPublicKey: string;
	readonly to?: string;

	readonly value: string;

	readonly gasLimit: number;
	readonly gasPrice: number;
	readonly nonce: string;
	readonly data: string;

	readonly v: number;
	readonly r: string;
	readonly s: string;
}

export interface SerializeOptions {
	excludeSignature: boolean;
}

export interface TransactionVerifier {
	verifyHash(data: TransactionData): Promise<boolean>;
	verifySchema(
		data: Omit<TransactionSerializable, "hash">,
		strict?: boolean,
	): Promise<SchemaValidationResult<TransactionSerializable>>;
	verifyLegacySecondSignature(data: TransactionSerializable, legacySecondPublicKey: string): Promise<boolean>;
}

export interface TransactionSigner {
	sign(
		transaction: TransactionUnsignedSerializable,
		keys: KeyPair,
		options?: SerializeOptions,
	): Promise<EcdsaSignature>;
	legacySecondSign(
		transaction: TransactionUnsignedSerializable,
		keys: KeyPair,
		options?: SerializeOptions,
	): Promise<string>;
}

export interface TransactionSerializer {
	serialize(transaction: TransactionSerializable, options?: SerializeOptions): Promise<Buffer>;
}

export interface TransactionDeserializer {
	deserialize(serialized: Buffer): Promise<{ data: TransactionSerializable; serialized: Buffer }>;
}

export interface TransactionFactory {
	fromHex(hex: string): Promise<Transaction>;
	fromBytes(buff: Buffer, strict?: boolean): Promise<Transaction>;
	fromJson(json: TransactionJson): Promise<Transaction>;
	fromData(data: TransactionSerializable, strict?: boolean): Promise<Transaction>;
	fromStorage(data: TransactionStorageDataExtended): Promise<BlockTransaction>;
}

export interface TransactionUtilities {
	toHashUnsigned(transaction: TransactionUnsignedSerializable): Promise<Buffer>;
	toHash(transaction: TransactionSerializable): Promise<Buffer>;
}

export type TransactionSchema = Record<string, unknown>;

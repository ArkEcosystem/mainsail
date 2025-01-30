import { BigNumber } from "@mainsail/utils";

import type { EcdsaSignature, KeyPair } from "./identities.js";
import type { SchemaValidationResult } from "./validator.js";

export interface Transaction {
	readonly id: string;
	readonly key: string;

	data: TransactionData;
	serialized: Buffer;
}

export type TransactionSchema = Record<string, any>;

export interface TransactionData {
	network: number;

	senderAddress: string;
	senderLegacyAddress?: string;
	senderPublicKey: string;
	recipientAddress?: string;

	value: BigNumber;

	gasLimit: number;
	gasPrice: number;

	nonce: BigNumber;
	data: string;

	id: string;
	timestamp: number;

	v?: number;
	r?: string;
	s?: string;
	legacySecondSignature?: string;

	sequence?: number;
	gasUsed?: number;
	blockId?: string;
	blockHeight?: number;
}

export interface TransactionJson {
	network?: number;

	senderAddress: string;
	senderPublicKey: string;
	recipientAddress?: string;

	value: string;

	gasLimit: number;
	gasPrice: number;

	nonce: string;
	data: string;

	id?: string;
	timestamp?: number;

	v?: number;
	r?: string;
	s?: string;

	sequence?: number;
	gasUsed?: number;
	blockId?: string;
	blockHeight?: number;
}

export interface MultiSignatureLegacyAsset {
	min: number;
	lifetime: number;
	keysgroup: string[];
}

export interface MultiSignatureAsset {
	min: number;
	publicKeys: string[];
}

export interface SerializeOptions {
	excludeSignature?: boolean;
	excludeMultiSignature?: boolean;
	// TODO: consider passing pre-allocated buffer
}

export interface TransactionServiceProvider {
	register(): Promise<void>;
}

export interface TransactionVerifier {
	verifySignatures(transaction: TransactionData, multiSignature: MultiSignatureAsset): Promise<boolean>;

	verifyHash(data: TransactionData): Promise<boolean>;

	verifySchema(data: Omit<TransactionData, "id">, strict?: boolean): Promise<SchemaValidationResult>;

	verifyLegacySecondSignature(data: TransactionData, legacySecondPublicKey: string): Promise<boolean>;
}

export interface TransactionSigner {
	sign(transaction: TransactionData, keys: KeyPair, options?: SerializeOptions): Promise<EcdsaSignature>;
	multiSign(transaction: TransactionData, keys: KeyPair, index?: number): Promise<string>;
}

export interface TransactionSerializer {
	serialize(transaction: Transaction, options?: SerializeOptions): Promise<Buffer>;
}

export interface TransactionDeserializer {
	deserialize(serialized: string | Buffer): Promise<Transaction>;
}

export interface TransactionFactory {
	fromHex(hex: string): Promise<Transaction>;

	fromBytes(buff: Buffer, strict?: boolean): Promise<Transaction>;

	fromJson(json: TransactionJson): Promise<Transaction>;

	fromData(data: TransactionData, strict?: boolean): Promise<Transaction>;
}

export type TransactionConstructor = any;

export interface TransactionRegistry {
	registerTransactionType(constructor: TransactionConstructor): void;

	deregisterTransactionType(constructor: TransactionConstructor): void;
}

export interface TransactionUtils {
	toBytes(data: TransactionData): Promise<Buffer>;

	toHash(transaction: TransactionData, options?: SerializeOptions): Promise<Buffer>;

	getId(transaction: Transaction): Promise<string>;
}

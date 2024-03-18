import { BigNumber, ByteBuffer } from "@mainsail/utils";

import type { KeyPair } from "./identities.js";
import type { SchemaValidationResult } from "./validator.js";

export interface Transaction {
	readonly id: string | undefined;
	readonly typeGroup: number | undefined;
	readonly type: number;
	readonly key: string;

	data: TransactionData;
	serialized: Buffer;

	assetSize(): number;
	serialize(options?: SerializeOptions): Promise<ByteBuffer>;
	deserialize(buf: ByteBuffer): Promise<void>;

	hasVendorField(): boolean;
}

export type TransactionSchema = Record<string, any>;

export interface TransactionAsset {
	[custom: string]: any;

	signature?: {
		publicKey: string;
	};
	validatorPublicKey?: string;
	username?: string;
	votes?: string[];
	unvotes?: string[];
	multiSignatureLegacy?: MultiSignatureLegacyAsset;
	multiSignature?: MultiSignatureAsset;
	payments?: MultiPaymentItem[];
	evmCall?: EvmCallAsset;
}

export interface EvmCallAsset {
	payload: string;
	gasLimit: number;
}

export interface TransactionData {
	version: number;
	network?: number;

	typeGroup: number;
	type: number;
	timestamp: number;
	nonce: BigNumber;
	senderPublicKey: string;

	fee: BigNumber;
	amount: BigNumber;

	expiration?: number;
	recipientId?: string;

	asset?: TransactionAsset;
	vendorField?: string;

	id?: string;
	signature?: string;
	signatures?: string[];

	blockId?: string;
	blockHeight?: number;
	sequence?: number;
}

export interface TransactionJson {
	version?: number;
	network?: number;

	typeGroup?: number;
	type: number;

	timestamp?: number;
	nonce?: string;
	senderPublicKey: string;

	fee: string;
	amount: string;

	expiration?: number;
	recipientId?: string;

	asset?: TransactionAsset;
	vendorField?: string | undefined;

	id?: string;
	signature?: string;
	signatures?: string[];

	blockId?: string;
	sequence?: number;
}
export interface MultiPaymentItem {
	amount: BigNumber;
	recipientId: string;
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

export interface VoteAsset {
	votes: string[];
	unvotes: string[];
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

	verifySchema(data: TransactionData, strict?: boolean): Promise<SchemaValidationResult>;
}

export interface TransactionSigner {
	sign(transaction: TransactionData, keys: KeyPair, options?: SerializeOptions): Promise<string>;
	multiSign(transaction: TransactionData, keys: KeyPair, index?: number): Promise<string>;
}

export interface TransactionSerializer {
	getBytes(transaction: TransactionData, options?: SerializeOptions): Promise<Buffer>;

	serialize(transaction: Transaction, options?: SerializeOptions): Promise<Buffer>;
}

export interface TransactionDeserializer {
	deserialize(serialized: string | Buffer): Promise<Transaction>;

	deserializeCommon(transaction: TransactionData, buf: ByteBuffer): void;
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

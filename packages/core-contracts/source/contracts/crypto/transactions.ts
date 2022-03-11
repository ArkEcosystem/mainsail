import { BigNumber, ByteBuffer } from "@arkecosystem/utils";

import { IKeyPair } from "./identities";
import { ISchemaValidationResult } from "./validator";

export interface ITransaction {
	readonly id: string | undefined;
	readonly typeGroup: number | undefined;
	readonly type: number;
	readonly key: string;

	data: ITransactionData;
	serialized: Buffer;

	serialize(options?: ISerializeOptions): Promise<ByteBuffer | undefined>;
	deserialize(buf: ByteBuffer): Promise<void>;

	hasVendorField(): boolean;
}

export interface ITransactionAsset {
	[custom: string]: any;

	signature?: {
		publicKey: string;
	};
	validator?: {
		username: string;
	};
	votes?: string[];
	multiSignatureLegacy?: IMultiSignatureLegacyAsset;
	multiSignature?: IMultiSignatureAsset;
	payments?: IMultiPaymentItem[];
}

export interface ITransactionData {
	version?: number;
	network?: number;

	typeGroup?: number;
	type: number;
	timestamp: number;
	nonce?: BigNumber;
	senderPublicKey: string | undefined;

	fee: BigNumber;
	amount: BigNumber;

	expiration?: number;
	recipientId?: string;

	asset?: ITransactionAsset;
	vendorField?: string;

	id?: string;
	signature?: string;
	signatures?: string[];

	blockId?: string;
	blockHeight?: number;
	sequence?: number;
}

export interface ITransactionJson {
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

	asset?: ITransactionAsset;
	vendorField?: string | undefined;

	id?: string;
	signature?: string;
	signatures?: string[];

	blockId?: string;
	sequence?: number;
}
export interface IMultiPaymentItem {
	amount: BigNumber;
	recipientId: string;
}

export interface IMultiSignatureLegacyAsset {
	min: number;
	lifetime: number;
	keysgroup: string[];
}

export interface IMultiSignatureAsset {
	min: number;
	publicKeys: string[];
}

export interface ISerializeOptions {
	excludeSignature?: boolean;
	excludeMultiSignature?: boolean;
}

export interface TransactionServiceProvider {
	register(): Promise<void>;
}

export interface ITransactionVerifier {
	verifySignatures(transaction: ITransactionData, multiSignature: IMultiSignatureAsset): Promise<boolean>;

	verifyHash(data: ITransactionData): Promise<boolean>;

	verifySchema(data: ITransactionData, strict?: boolean): ISchemaValidationResult;
}

export interface ITransactionSigner {
	sign(transaction: ITransactionData, keys: IKeyPair, options?: ISerializeOptions): Promise<string>;
	multiSign(transaction: ITransactionData, keys: IKeyPair, index?: number): Promise<string>;
}

export interface ITransactionSerializer {
	getBytes(transaction: ITransactionData, options?: ISerializeOptions): Promise<Buffer>;

	serialize(transaction: ITransaction, options?: ISerializeOptions): Promise<Buffer>;
}

export interface ITransactionDeserializer {
	deserialize(serialized: string | Buffer): Promise<ITransaction>;

	deserializeCommon(transaction: ITransactionData, buf: ByteBuffer): void;
}

export interface ITransactionFactory {
	fromHex(hex: string): Promise<ITransaction>;

	fromBytes(buff: Buffer, strict?: boolean): Promise<ITransaction>;

	fromJson(json: ITransactionJson): Promise<ITransaction>;

	fromData(data: ITransactionData, strict?: boolean): Promise<ITransaction>;
}

export type TransactionConstructor = any;

export interface ITransactionRegistry {
	registerTransactionType(constructor: TransactionConstructor): void;

	deregisterTransactionType(constructor: TransactionConstructor): void;
}

export interface ITransactionUtils {
	toBytes(data: ITransactionData): Promise<Buffer>;

	toHash(transaction: ITransactionData, options?: ISerializeOptions): Promise<Buffer>;

	getId(transaction: ITransactionData, options?: ISerializeOptions): Promise<string>;
}

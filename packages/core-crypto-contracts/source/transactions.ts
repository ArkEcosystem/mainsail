import { ByteBuffer } from "@arkecosystem/utils";
import { ErrorObject } from "ajv";
import { IKeyPair } from "./identities";

export interface ITransaction {
	readonly id: string | undefined;
	readonly typeGroup: number | undefined;
	readonly type: number;
	readonly verified: boolean;
	readonly key: string;
	readonly staticFee: any; // @TODO: use BigNumber from ../../crypto/utils

	isVerified: boolean;

	data: ITransactionData;
	serialized: Buffer;
	timestamp: number;

	serialize(options?: ISerializeOptions): any | undefined; // @TODO: use ByteBuffer from ../../crypto/utils
	deserialize(buf: any): void; // @TODO: use ByteBuffer from ../../crypto/utils

	verify(options?: IVerifyOptions): Promise<boolean>;
	verifySchema(strict?: boolean): ISchemaValidationResult;

	toJson(): ITransactionJson;

	hasVendorField(): boolean;
}

export interface ITransactionAsset {
	[custom: string]: any;

	signature?: {
		publicKey: string;
	};
	delegate?: {
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
	nonce?: any; // @TODO: use ByteBuffer from ../../crypto/utils
	senderPublicKey: string | undefined;

	fee: any; // @TODO: use ByteBuffer from ../../crypto/utils
	amount: any; // @TODO: use ByteBuffer from ../../crypto/utils

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

export interface ISchemaValidationResult<T = any> {
	value: T | undefined;
	error: any;
	errors?: ErrorObject[] | undefined;
}

export interface IMultiPaymentItem {
	amount: any; // @TODO: use ByteBuffer from ../../crypto/utils
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

export interface IDeserializeOptions {
	acceptLegacyVersion?: boolean;
	disableVersionCheck?: boolean;
}

export interface IVerifyOptions {
	disableVersionCheck?: boolean;
}

export interface ISerializeOptions {
	acceptLegacyVersion?: boolean;
	disableVersionCheck?: boolean;
	excludeSignature?: boolean;
	excludeMultiSignature?: boolean;

	// WORKAROUND: A handful of mainnet transactions have an invalid
	// recipient. Due to a refactor of the Address network byte
	// validation it is no longer trivially possible to handle them.
	// If an invalid address is encountered during transfer serialization,
	// this error field is used to bubble up the error and defer the
	// `AddressNetworkByteError` until the actual id is available to call `isException`.
	addressError?: string;
}

export interface TransactionServiceProvider {
	register(): Promise<void>;
}

export interface ITransactionVerifier {
	verify(data: ITransactionData, options?: IVerifyOptions): Promise<boolean>;

	verifySignatures(transaction: ITransactionData, multiSignature: IMultiSignatureAsset): Promise<boolean>;

	verifyHash(data: ITransactionData, disableVersionCheck?: boolean): Promise<boolean>;

	verifySchema(data: ITransactionData, strict?: boolean): ISchemaValidationResult;
}

export interface ITransactionSigner {
	sign(transaction: ITransactionData, keys: IKeyPair, options?: ISerializeOptions): Promise<string>;
	multiSign(transaction: ITransactionData, keys: IKeyPair, index?: number): Promise<string>;
}

export interface ITransactionSerializer {
	getBytes(transaction: ITransactionData, options?: ISerializeOptions): Buffer;

	serialize(transaction: ITransaction, options?: ISerializeOptions): Buffer;
}

export interface ITransactionDeserializer {
	deserialize(serialized: string | Buffer, options?: IDeserializeOptions): ITransaction;

	deserializeCommon(transaction: ITransactionData, buf: ByteBuffer): void;
}

export interface ITransactionFactory {
	fromHex(hex: string): Promise<ITransaction>;

	fromBytes(buff: Buffer, strict?: boolean, options?: IDeserializeOptions): Promise<ITransaction>;

	fromBytesUnsafe(buff: Buffer, id?: string): Promise<ITransaction>;

	fromJson(json: ITransactionJson): Promise<ITransaction>;

	fromData(data: ITransactionData, strict?: boolean, options?: IDeserializeOptions): Promise<ITransaction>;
}

export type TransactionConstructor = any;

export interface ITransactionRegistry {
	registerTransactionType(constructor: TransactionConstructor): void;

	deregisterTransactionType(constructor: TransactionConstructor): void;
}

export interface ITransactionUtils {
	toBytes(data: ITransactionData): Buffer;

	toHash(transaction: ITransactionData, options?: ISerializeOptions): Promise<Buffer>;

	getId(transaction: ITransactionData, options?: ISerializeOptions): Promise<string>;
}

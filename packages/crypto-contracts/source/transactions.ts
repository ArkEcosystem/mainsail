import { ErrorObject } from "ajv";

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

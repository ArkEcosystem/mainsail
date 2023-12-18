import { ByteBuffer } from "@mainsail/utils";

export type MandatoryPropertyType =
	| "hash"
	| "publicKey"
	| "hex"
	| "signature"
	| "transactions"
	| "consensusSignature"
	| "validatorSet";

export type OptionalPropertyType =
	| "uint8"
	| "uint16"
	| "uint32"
	| "uint48"
	| "uint64"
	| "address"
	| "bigint"
	| "blockId";

export type SerializationSchema = { type: MandatoryPropertyType } | { type: OptionalPropertyType; optional?: true };

export interface SerializationConfiguration {
	schema: Record<string, SerializationSchema>;
	length: number;
	skip: number;
}

export type DeserializationSchema =
	| { type: MandatoryPropertyType; size?: number }
	| { type: OptionalPropertyType; optional?: true };

export interface DeserializationConfiguration {
	schema: Record<string, DeserializationSchema>;
	length?: number;
	skip?: number;
}

export interface Serializer {
	serialize<T>(data: T, configuration: SerializationConfiguration): Promise<Buffer>;

	deserialize<T>(source: ByteBuffer, target: T, configuration: DeserializationConfiguration): Promise<T>;
}

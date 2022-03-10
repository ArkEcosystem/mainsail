import { ByteBuffer } from "@arkecosystem/utils";

export type PropertyType =
	| "uint32"
	| "uint64"
	| "address"
	| "bigint"
	| "hash"
	| "publicKey"
	| "signature"
	| "transactions";

export interface SerializationSchema {
	type: PropertyType;
	required?: boolean;
}

export interface SerializationConfiguration {
	schema: Record<string, SerializationSchema>;
	length?: number;
	skip?: number;
}

export interface DeserializationSchema {
	size?: number;
	type: PropertyType;
}

export interface DeserializationConfiguration {
	schema: Record<string, DeserializationSchema>;
	length?: number;
	skip?: number;
}

export interface ISerializer {
	serialize<T>(data: T, configuration: SerializationConfiguration): Promise<Buffer>;

	deserialize<T>(source: ByteBuffer, target: T, configuration: DeserializationConfiguration): Promise<T>;
}

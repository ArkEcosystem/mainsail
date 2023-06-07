import { ByteBuffer } from "@mainsail/utils";

export type MandatoryPropertyType =
	| "uint32"
	| "uint64"
	| "address"
	| "bigint"
	| "hash"
	| "publicKey"
	| "hex"
	| "transactions";

export type OptionalPropertyType = "blockId" | "signature";

export type SerializationSchema = {
	type: MandatoryPropertyType;
	required: true;
} |
{
	type: OptionalPropertyType,
	required?: boolean
};

export interface SerializationConfiguration {
	schema: Record<string, SerializationSchema>;
	length: number;
	skip: number;
}

export interface DeserializationSchema {
	type: OptionalPropertyType | MandatoryPropertyType,
	size?: number;
};

export interface DeserializationConfiguration {
	schema: Record<string, DeserializationSchema>;
	length?: number;
	skip?: number;
}

export interface ISerializer {
	serialize<T>(data: T, configuration: SerializationConfiguration): Promise<Buffer>;

	deserialize<T>(source: ByteBuffer, target: T, configuration: DeserializationConfiguration): Promise<T>;
}

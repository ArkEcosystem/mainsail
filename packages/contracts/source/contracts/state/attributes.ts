import { JsonValue } from "../types/index.js";

export interface AttributeRepository {
	set(name: string, type: AttributeType): void;
	has(name: string): boolean;
	getAttributeNames(): IterableIterator<string>;
	getAttributeType<T>(name: string): AttributeType;
}

export interface Attribute<T> {
	get(): T;
	set(value: T): void;
	clone(): Attribute<T>;
	toJson(): JsonValue;
	fromJson(value: JsonValue): Attribute<T>;
}

export enum AttributeType {
	Boolean = "boolean",
	Number = "number",
	String = "string",
	BigNumber = "bigNumber",
	Object = "object",
}

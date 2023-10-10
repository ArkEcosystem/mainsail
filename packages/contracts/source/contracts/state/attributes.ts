import { JsonValue } from "../types";

export interface IAttributeRepository {
	set(name: string, type: AttributeType): void;
	has(name: string): boolean;
	getAttributeNames(): IterableIterator<string>;
	getAttributeType<T>(name: string): AttributeType;
}

export interface IAttribute<T> {
	get(): T;
	set(value: T): void;
	clone(): IAttribute<T>;
	toJson(): JsonValue;
	fromJson(value: JsonValue): IAttribute<T>;
}

export enum AttributeType {
	Boolean = "boolean",
	Number = "number",
	String = "string",
	BigNumber = "bigNumber",
	Object = "object",
}

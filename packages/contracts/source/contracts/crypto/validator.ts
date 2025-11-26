import type { AnySchemaObject, ErrorObject, FormatDefinition, KeywordDefinition, Schema } from "ajv";
import type { Ajv } from "ajv";

export interface SchemaValidationResult<T = unknown> {
	value: T;
	error?: string;
	errors?: ErrorObject[] | undefined;
}

export interface Validator {
	validate<T = unknown>(schemaKeyReference: string | Schema, data: T): SchemaValidationResult<T>;

	addFormat(name: string, format: FormatDefinition<string> | FormatDefinition<number>): void;
	addKeyword(definition: KeywordDefinition): void;
	addSchema(schema: AnySchemaObject): void;

	hasSchema(keyReference: string): boolean;

	removeKeyword(keyword: string): void;
	removeSchema(keyReference: string): void;

	extend(callback: (ajv: Ajv) => void): void;
}

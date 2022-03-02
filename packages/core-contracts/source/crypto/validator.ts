import Ajv, { ErrorObject } from "ajv";

export interface ISchemaValidationResult<T = any> {
	value: T | undefined;
	error: any;
	errors?: ErrorObject[] | undefined;
}

export interface IValidator {
	validate<T = any>(schemaKeyReference: string | boolean | object, data: T): Promise<ISchemaValidationResult<T>>;

	addFormat(name: string, format: Ajv.FormatDefinition): void;

	addKeyword(keyword: string, definition: Ajv.KeywordDefinition): void;

	addSchema(schema: object | object[], key?: string): void;

	removeKeyword(keyword: string): void;

	removeSchema(schemaKeyReference: string | boolean | object | RegExp): void;

	extend(callback: (ajv: Ajv.Ajv) => void): void;
}

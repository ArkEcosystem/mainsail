import { JsonObject } from "../types";

export interface Validator {
	validate(data: JsonObject, schema: object): void;

	passes(): boolean;

	fails(): boolean;

	failed(): Record<string, string[]>;

	errors(): Record<string, string[]>;

	valid(): JsonObject | undefined;

	invalid(): JsonObject;

	attributes(): JsonObject;
}

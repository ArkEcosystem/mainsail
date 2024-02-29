import { injectable, postConstruct } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import Ajv, { AnySchema, FormatDefinition, KeywordDefinition, Schema } from "ajv/dist/2020";
import formats from "ajv-formats";
import keywords from "ajv-keywords";

@injectable()
export class Validator implements Contracts.Crypto.Validator {
	#ajv!: Ajv;

	@postConstruct()
	public postConstruct(): void {
		this.#ajv = new Ajv({
			$data: true,
			strict: true,
		});

		keywords(this.#ajv);
		formats(this.#ajv);
	}

	public validate<T = any>(schemaKeyReference: string | Schema, data: T): Contracts.Crypto.SchemaValidationResult<T> {
		try {
			this.#ajv.validate(schemaKeyReference, data);

			this.#ajv.errors;

			return {
				error: this.#ajv.errors ? this.#ajv.errorsText() : undefined,
				errors: this.#ajv.errors || undefined,
				value: data,
			};
		} catch (error) {
			return { error: error.stack, errors: [], value: data };
		}
	}

	public addFormat(name: string, format: FormatDefinition<string> | FormatDefinition<number>): void {
		this.#ajv.addFormat(name, format);
	}

	public addKeyword(definition: KeywordDefinition): void {
		this.#ajv.addKeyword(definition);
	}

	public addSchema(schema: AnySchema | AnySchema[]): void {
		this.#ajv.addSchema(schema);
	}

	public hasSchema(keyReference: string): boolean {
		return this.#ajv.getSchema(keyReference) !== undefined;
	}

	public removeKeyword(keyword: string): void {
		this.#ajv.removeKeyword(keyword);
	}

	public removeSchema(schemaKeyReference: string): void {
		this.#ajv.removeSchema(schemaKeyReference);
	}

	public extend(callback: (ajv: Ajv) => void): void {
		callback(this.#ajv);
	}
}

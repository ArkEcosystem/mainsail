import { injectable, postConstruct } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import _Ajv, { AnySchema, FormatDefinition, KeywordDefinition, Schema } from "ajv";
import AjvCore from "ajv/dist/core.js";
import formats from "ajv-formats";
import keywords from "ajv-keywords";

// Can be removed once upstream is fixed:
// https://github.com/ajv-validator/ajv/issues/2132
// https://github.com/ajv-validator/ajv/pull/2389
const Ajv = _Ajv as unknown as typeof _Ajv.default;

@injectable()
export class Validator implements Contracts.Crypto.Validator {
	#ajv!: AjvCore.default;

	@postConstruct()
	public postConstruct(): void {
		// @ts-ignore
		this.#ajv = new Ajv({
			$data: true,
			strict: true,
		});

		keywords.default(this.#ajv);
		formats.default(this.#ajv);
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

	public removeKeyword(keyword: string): void {
		this.#ajv.removeKeyword(keyword);
	}

	public removeSchema(schemaKeyReference: string): void {
		this.#ajv.removeSchema(schemaKeyReference);
	}

	public extend(callback: (ajv: AjvCore.default) => void): void {
		callback(this.#ajv);
	}
}

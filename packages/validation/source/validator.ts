import { injectable, postConstruct } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { AnySchema, FormatDefinition, KeywordDefinition, Schema } from "ajv";
import AjvCore from "ajv/dist/2020.js";
import formats from "ajv-formats";
import keywords from "ajv-keywords";

// Can be removed once upstream is fixed:
// https://github.com/ajv-validator/ajv/issues/2132
// https://github.com/ajv-validator/ajv/pull/2389
// const Ajv = _Ajv as unknown as typeof _Ajv.default;

@injectable()
export class Validator implements Contracts.Crypto.Validator {
	ajv_!: AjvCore.default;

	@postConstruct()
	public postConstruct(): void {
		this.ajv_ = new AjvCore.default({
			$data: true,
			strict: true,
		});

		keywords.default(this.ajv_);
		formats.default(this.ajv_);
	}

	public validate<T = any>(schemaKeyReference: string | Schema, data: T): Contracts.Crypto.SchemaValidationResult<T> {
		try {
			this.ajv_.validate(schemaKeyReference, data);

			this.ajv_.errors;

			return {
				error: this.ajv_.errors ? this.ajv_.errorsText() : undefined,
				errors: this.ajv_.errors || undefined,
				value: data,
			};
		} catch (error) {
			return { error: error.stack, errors: [], value: data };
		}
	}

	public addFormat(name: string, format: FormatDefinition<string> | FormatDefinition<number>): void {
		this.ajv_.addFormat(name, format);
	}

	public addKeyword(definition: KeywordDefinition): void {
		this.ajv_.addKeyword(definition);
	}

	public addSchema(schema: AnySchema | AnySchema[]): void {
		this.ajv_.addSchema(schema);
	}

	public removeKeyword(keyword: string): void {
		this.ajv_.removeKeyword(keyword);
	}

	public removeSchema(schemaKeyReference: string): void {
		this.ajv_.removeSchema(schemaKeyReference);
	}

	public extend(callback: (ajv: AjvCore.default) => void): void {
		callback(this.ajv_);
	}
}

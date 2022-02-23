import { Container } from "@arkecosystem/core-container";
import { ISchemaValidationResult } from "@arkecosystem/core-crypto-contracts";
import Ajv from "ajv";
import keywords from "ajv-keywords";

@Container.injectable()
export class Validator {
	#ajv: Ajv.Ajv;

	@Container.postConstruct()
	public postConstruct() {
		this.#ajv = new Ajv({
			$data: true,
			extendRefs: true,
			removeAdditional: true,
		});

		keywords(this.#ajv);
	}

	public getInstance(): Ajv.Ajv {
		return this.#ajv;
	}

	public async validate<T = any>(
		schemaKeyReference: string | boolean | object,
		data: T,
	): Promise<ISchemaValidationResult<T>> {
		try {
			await this.#ajv.validate(schemaKeyReference, data);

			return {
				error: this.#ajv.errors ? this.#ajv.errorsText() : undefined,
				errors: this.#ajv.errors || undefined,
				value: data,
			};
		} catch (error) {
			return { error: error.stack, errors: [], value: undefined };
		}
	}

	public addFormat(name: string, format: Ajv.FormatDefinition): void {
		this.#ajv.addFormat(name, format);
	}

	public addKeyword(keyword: string, definition: Ajv.KeywordDefinition): void {
		this.#ajv.addKeyword(keyword, definition);
	}

	public addSchema(schema: object | object[], key?: string): void {
		this.#ajv.addSchema(schema, key);
	}

	public removeKeyword(keyword: string): void {
		this.#ajv.removeKeyword(keyword);
	}

	public removeSchema(schemaKeyReference: string | boolean | object | RegExp): void {
		this.#ajv.removeSchema(schemaKeyReference);
	}

	public extend(callback: (ajv: Ajv.Ajv) => void): void {
		callback(this.#ajv);
	}
}

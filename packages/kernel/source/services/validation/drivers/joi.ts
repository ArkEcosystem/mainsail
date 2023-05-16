import { Contracts } from "@mainsail/contracts";
import { AnySchema, ValidationErrorItem } from "joi";
@injectable()
export class JoiValidator implements Contracts.Kernel.Validator {
	#data!: Contracts.Types.JsonObject;

	#resultValue: Contracts.Types.JsonObject | undefined;

	#resultError: ValidationErrorItem[] | undefined;

	public validate(data: Contracts.Types.JsonObject, schema: object): void {
		this.#data = data;

		const { error, value } = (schema as AnySchema).validate(this.#data);

		this.#resultValue = error ? undefined : value;

		if (error) {
			this.#resultError = error.details;
		}
	}

	public passes(): boolean {
		return !this.#resultError;
	}

	public fails(): boolean {
		return !this.passes();
	}

	public failed(): Record<string, string[]> {
		return this.#groupErrors("type");
	}

	public errors(): Record<string, string[]> {
		return this.#groupErrors("message");
	}

	public valid(): Contracts.Types.JsonObject | undefined {
		return this.#resultValue;
	}

	public invalid(): Contracts.Types.JsonObject {
		const errors: Contracts.Types.JsonObject = {};

		if (!this.#resultError) {
			return errors;
		}

		for (const error of this.#resultError) {
			if (error.context && error.context.key) {
				errors[error.context.key] = error.context.value;
			}
		}

		return errors;
	}

	public attributes(): Contracts.Types.JsonObject {
		return this.#data;
	}

	#groupErrors(attribute: string): Record<string, string[]> {
		const errors: Record<string, string[]> = {};

		if (!this.#resultError) {
			return errors;
		}

		for (const error of this.#resultError) {
			const errorKey: string | number = error.path[0];

			if (!Array.isArray(errors[errorKey])) {
				errors[errorKey] = [];
			}

			errors[errorKey].push(error[attribute]);
		}

		return errors;
	}
}

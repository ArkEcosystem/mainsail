import { AnySchema, ValidationErrorItem } from "joi";

import { Validator } from "../../../contracts/kernel/validation";
import { injectable } from "../../../ioc";
import { JsonObject } from "../../../types";

@injectable()
export class JoiValidator implements Validator {
	private data!: JsonObject;

	private resultValue: JsonObject | undefined;

	private resultError: ValidationErrorItem[] | undefined;

	public validate(data: JsonObject, schema: object): void {
		this.data = data;

		const { error, value } = (schema as AnySchema).validate(this.data);

		this.resultValue = error ? undefined : value;

		if (error) {
			this.resultError = error.details;
		}
	}

	public passes(): boolean {
		return !this.resultError;
	}

	public fails(): boolean {
		return !this.passes();
	}

	public failed(): Record<string, string[]> {
		return this.groupErrors("type");
	}

	public errors(): Record<string, string[]> {
		return this.groupErrors("message");
	}

	public valid(): JsonObject | undefined {
		return this.resultValue;
	}

	public invalid(): JsonObject {
		const errors: JsonObject = {};

		if (!this.resultError) {
			return errors;
		}

		for (const error of this.resultError) {
			if (error.context && error.context.key) {
				errors[error.context.key] = error.context.value;
			}
		}

		return errors;
	}

	public attributes(): JsonObject {
		return this.data;
	}

	private groupErrors(attribute: string): Record<string, string[]> {
		const errors: Record<string, string[]> = {};

		if (!this.resultError) {
			return errors;
		}

		for (const error of this.resultError) {
			const errorKey: string | number = error.path[0];

			if (!Array.isArray(errors[errorKey])) {
				errors[errorKey] = [];
			}

			errors[errorKey].push(error[attribute]);
		}

		return errors;
	}
}

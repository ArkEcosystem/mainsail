import Joi from "joi";

import { injectable } from "../ioc";

@injectable()
export class InputValidator {
	public validate(data: object, schema: object): object {
		const { error, value } = Joi.object(schema).unknown(true).validate(data);

		if (error) {
			let errorMessage = "";

			for (const err of error.details) {
				errorMessage += err.message;
			}

			throw new Error(errorMessage);
		}

		return value;
	}
}

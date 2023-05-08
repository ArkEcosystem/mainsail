import { injectable } from "@mainsail/container";
import Joi from "joi";

@injectable()
export class InputValidator {
	public validate(data: object, schema: object): object {
		const { error, value } = Joi.object(schema).unknown(true).validate(data);

		if (error) {
			let errorMessage = "";

			for (const error_ of error.details) {
				errorMessage += error_.message;
			}

			throw new Error(errorMessage);
		}

		return value;
	}
}

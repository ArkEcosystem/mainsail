import { SocketErrors } from "../../enums";

export const validate = (schema, data, validator) => {
	const { error: validationError } = validator.validate(schema, data);

	if (validationError) {
		const error = new Error(`Data validation error : ${validationError}`);
		error.name = SocketErrors.Validation;

		throw error;
	}
};

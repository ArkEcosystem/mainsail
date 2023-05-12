import { SocketErrors } from "../../enums";

// TODO: Add types
export const validate = (schema, data, validator) => {
	const { error: validationError } = validator.validate(schema, data);

	if (validationError) {
		const error = new Error(`Data validation error : ${validationError}`);
		error.name = SocketErrors.Validation;

		throw error;
	}
};

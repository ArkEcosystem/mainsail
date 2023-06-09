// import { Validation } from "@mainsail/crypto";
// import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";

const name = "hapi-ajv";

// todo: review implementation - still needed?
export const hapiAjv = {
	name,
	register: async (server: Hapi.Server, options: any): Promise<void> => {
		// const createErrorResponse = (request, h, errors) =>
		// 	Boom.badData(errors.map((error) => error.message).join(","));

		server.ext({
			method: (request, h) =>
				// const config = request.route.settings.plugins[name] || {};

				// if (config.payloadSchema) {
				// 	const { error, errors } = Validation.validator.validate(config.payloadSchema, request.payload);

				// 	if (error) {
				// 		return createErrorResponse(request, h, errors);
				// 	}
				// }

				// if (config.querySchema) {
				// 	const { error, errors } = Validation.validator.validate(config.querySchema, request.query);

				// 	if (error) {
				// 		return createErrorResponse(request, h, errors);
				// 	}
				// }

				h.continue,
			type: "onPreHandler",
		});
	},
	version: "1.0.0",
};

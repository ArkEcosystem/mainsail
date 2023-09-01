import Hapi from "@hapi/hapi";
import Joi from "joi";

import { BlocksController } from "../controllers/blocks";
import { pagination } from "../schemas";

export const register = (server: Hapi.Server): void => {
	const controller = server.app.app.resolve(BlocksController);
	server.bind(controller);

	server.route({
		handler: (request: Hapi.Request) => controller.index(request),
		method: "GET",
		options: {
			plugins: {
				pagination: {
					enabled: true,
				},
			},
			validate: {
				query: Joi.object({
					transform: Joi.bool().default(true),
				}).concat(pagination),
			},
		},
		path: "/blocks",
	});

	server.route({
		handler: (request: Hapi.Request) => controller.transactions(request),
		method: "GET",
		options: {
			plugins: {
				pagination: {
					enabled: true,
				},
			},
			validate: {
				params: Joi.object({
					id: Joi.string(),
				}),
				query: Joi.object({
					transform: Joi.bool().default(true),
				}).concat(pagination),
			},
		},
		path: "/blocks/{id}/transactions",
	});

	// server.route({
	// 	handler: (request: Hapi.Request) => controller.first(request),
	// 	method: "GET",
	// 	options: {
	// 		validate: {
	// 			query: Joi.object({
	// 				transform: Joi.bool().default(true),
	// 			}),
	// 		},
	// 	},
	// 	path: "/blocks/first",
	// });

	// server.route({
	// 	handler: (request: Hapi.Request) => controller.last(request),
	// 	method: "GET",
	// 	options: {
	// 		validate: {
	// 			query: Joi.object({
	// 				transform: Joi.bool().default(true),
	// 			}),
	// 		},
	// 	},
	// 	path: "/blocks/last",
	// });

	// server.route({
	// 	handler: (request: Hapi.Request) => controller.show(request),
	// 	method: "GET",
	// 	options: {
	// 		validate: {
	// 			params: Joi.object({
	// 				id: blockId,
	// 			}),
	// 			query: Joi.object({
	// 				transform: Joi.bool().default(true),
	// 			}),
	// 		},
	// 	},
	// 	path: "/blocks/{id}",
	// });
};

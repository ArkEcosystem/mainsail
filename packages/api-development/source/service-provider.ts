import { AbstractServiceProvider, Plugins, ServerConstructor } from "@mainsail/api-common";
import Joi from "joi";

import Handlers from "./handlers";
import { Identifiers as ApiIdentifiers } from "./identifiers";
import { Server } from "./server";

export class ServiceProvider extends AbstractServiceProvider<Server> {
	protected httpIdentifier(): symbol {
		return ApiIdentifiers.HTTP;
	}

	protected httpsIdentifier(): symbol {
		return ApiIdentifiers.HTTPS;
	}

	protected getServerConstructor(): ServerConstructor<Server> {
		return Server;
	}

	protected getHandlers(): any | any[] {
		return Handlers;
	}

	protected getPlugins(): any[] {
		const config = this.config().get<any>("plugins");

		return [
			{
				options: {
					trustProxy: config.trustProxy,
					whitelist: config.whitelist,
				},
				plugin: Plugins.whitelist,
			},
			{
				options: {
					...config.rateLimit,
					trustProxy: config.trustProxy,
				},
				plugin: Plugins.rateLimit,
			},
			{ plugin: Plugins.commaArrayQuery },
			{ plugin: Plugins.dotSeparatedQuery },
			{
				options: {
					query: {
						limit: {
							default: config.pagination.limit,
						},
					},
				},
				plugin: Plugins.pagination,
			},
		];
	}

	public configSchema(): Joi.ObjectSchema {
		return Joi.object({
			plugins: Joi.object({
				pagination: Joi.object({
					limit: Joi.number().integer().min(0).required(),
				}).required(),
				rateLimit: Joi.object({
					blacklist: Joi.array().items(Joi.string()).required(),
					duration: Joi.number().integer().min(0).required(),
					enabled: Joi.bool().required(),
					points: Joi.number().integer().min(0).required(),
					whitelist: Joi.array().items(Joi.string()).required(),
				}).required(),
				socketTimeout: Joi.number().integer().min(0).required(),
				trustProxy: Joi.bool().required(),
				whitelist: Joi.array().items(Joi.string()).required(),
			}).required(),
			server: Joi.object({
				http: Joi.object({
					enabled: Joi.bool().required(),
					host: Joi.string().required(),
					port: Joi.number().integer().min(1).max(65_535).required(),
				}).required(),
				https: Joi.object({
					enabled: Joi.bool().required(),
					host: Joi.string().required(),
					port: Joi.number().integer().min(1).max(65_535).required(),
					tls: Joi.object({
						cert: Joi.string().when("...enabled", { is: true, then: Joi.required() }),
						key: Joi.string().when("...enabled", { is: true, then: Joi.required() }),
					}).required(),
				}).required(),
			}).required(),
		})
			.required()
			.unknown(true);
	}
}

import { AbstractServiceProvider, Plugins, ServerConstructor } from "@mainsail/api-common";
import Joi from "joi";

import Handlers from "./handlers.js";
import { Identifiers as ApiIdentifiers } from "./identifiers.js";
import { Server } from "./server.js";

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

	protected getHandlers(): any {
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
			{ plugin: Plugins.responseHeaders },
		];
	}

	public configSchema(): Joi.ObjectSchema {
		return super.configSchema().concat(
			Joi.object({
				options: Joi.object({
					estimateTotalCount: Joi.bool().required(),
				}).required(),

				plugins: Joi.object({
					cache: Joi.object({
						checkperiod: Joi.number().integer().min(0).required(),
						enabled: Joi.bool().required(),
						stdTTL: Joi.number().integer().min(0).required(),
					}).required(),
					log: Joi.object({
						enabled: Joi.bool().required(),
					}).required(),
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
			}).unknown(true),
		);
	}
}

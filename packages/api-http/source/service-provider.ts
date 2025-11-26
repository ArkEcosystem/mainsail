import { AbstractServiceProvider, Plugins, ServerConstructor } from "@mainsail/api-common";
import { injectable } from "@mainsail/container";
import Joi from "joi";

import Handlers from "./handlers.js";
import { Identifiers as ApiIdentifiers } from "./identifiers.js";
import { Server } from "./server.js";
import { NamedPlugin, Plugin } from "@hapi/hapi";

@injectable()
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

	protected getHandlers(): NamedPlugin<unknown> {
		return Handlers as unknown as NamedPlugin<unknown>;
	}

	protected getPlugins(): Plugin<unknown>[] {
		const config = this.config().getRequired<{
			trustProxy: boolean;
			whitelist: string[];
			socketTimeout: number;
			rateLimit: {
				blacklist: string[];
				duration: number;
				enabled: boolean;
				points: number;
				whitelist: string[];
			};
			pagination: {
				limit: number;
			};
		}>("plugins");

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
			{ plugin: Plugins.databaseReady },
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
		] as unknown as Plugin<unknown>[];
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

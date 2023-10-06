import { AbstractServiceProvider, ServerConstructor } from "@mainsail/api-common";
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

			}).unknown(true)
		);
	}
}

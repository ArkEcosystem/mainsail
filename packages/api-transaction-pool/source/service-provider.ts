import { AbstractServiceProvider, ServerConstructor } from "@mainsail/api-common";
import Joi from "joi";
import Handlers from "./handlers";
import { Identifiers as ApiTransactionPoolIdentifiers } from "./identifiers";
import { Server } from "./server";

export class ServiceProvider extends AbstractServiceProvider<Server> {
	protected httpIdentifier(): symbol {
		return ApiTransactionPoolIdentifiers.HTTP;
	}

	protected httpsIdentifier(): symbol {
		return ApiTransactionPoolIdentifiers.HTTPS;
	}

	protected getServerConstructor(): ServerConstructor<Server> {
		return Server;
	}

	protected getHandlers(): any | any[] {
		return Handlers;
	}

	public configSchema(): object {
		return Joi.object({
			plugins: Joi.object({
				pagination: Joi.object({
					limit: Joi.number().integer().min(0).required(),
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
		}).unknown(true);
	}

}

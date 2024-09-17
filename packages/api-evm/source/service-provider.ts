import { AbstractServiceProvider, Plugins, ServerConstructor } from "@mainsail/api-common";
import { Contracts } from "@mainsail/contracts";
import Joi from "joi";

import {
	CallAction,
	EthBlockNumberAction,
	EthGetBalanceAction,
	EthGetCodeAction,
	EthGetStorageAtAction,
	EthGetTransactionCount,
	NetListeningAction,
	NetPeerCountAction,
	Web3ClientVersionAction,
} from "./actions/index.js";
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

		// @TODO: Implement RPC rate limiting & whitelist
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
			{
				plugin: Plugins.rpcResponseHandler,
			},
		];
	}

	protected getActions(): Contracts.Api.RPC.Action[] {
		return [
			this.app.resolve(CallAction),
			this.app.resolve(EthBlockNumberAction),
			this.app.resolve(EthGetBalanceAction),
			this.app.resolve(EthGetCodeAction),
			this.app.resolve(EthGetStorageAtAction),
			this.app.resolve(EthGetTransactionCount),
			this.app.resolve(NetListeningAction),
			this.app.resolve(NetPeerCountAction),
			this.app.resolve(Web3ClientVersionAction),
		];
	}

	public configSchema(): Joi.ObjectSchema {
		return Joi.object({
			plugins: Joi.object({
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

import { AbstractServiceProvider, Plugins, ServerConstructor } from "@mainsail/api-common";
import { injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import Joi from "joi";

import {
	CallAction,
	EthBlockNumberAction,
	EthChainIdAction,
	EthEstimateGasAction,
	EthGasPriceAction,
	EthGetBalanceAction,
	EthGetBlockByHashAction,
	EthGetBlockByNumberAction,
	EthGetBlockTransactionCountByHash,
	EthGetBlockTransactionCountByNumber,
	EthGetCodeAction,
	EthGetStorageAtAction,
	EthGetTransactionByBlockHashAndIndex,
	EthGetTransactionByBlockNumberAndIndex,
	EthGetTransactionByHash,
	EthGetTransactionCount,
	EthGetTransactionReceipt,
	EthGetUncleByBlockHashAndIndex,
	EthGetUncleByBlockNumberAndIndex,
	EthGetUncleCountByBlockHash,
	EthGetUncleCountByBlockNumber,
	EthSendRawTransactionAction,
	NetListeningAction,
	NetPeerCountAction,
	NetVersion,
	Web3ClientVersionAction,
	Web3Sha3,
} from "./actions/index.js";
import Handlers from "./handlers.js";
import { Server } from "./server.js";
import { makeKeywords, schemas } from "./validation/index.js";

@injectable()
export class ServiceProvider extends AbstractServiceProvider<Server> {
	public async register(): Promise<void> {
		for (const keyword of Object.values(
			makeKeywords(this.app.get<Contracts.State.Store>(Identifiers.State.Store)),
		)) {
			this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addKeyword(keyword);
		}

		for (const schema of Object.values(schemas)) {
			this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}

		await super.register();
	}

	protected httpIdentifier(): symbol {
		return Identifiers.Evm.API.HTTP;
	}

	protected httpsIdentifier(): symbol {
		return Identifiers.Evm.API.HTTPS;
	}

	protected getServerConstructor(): ServerConstructor<Server> {
		return Server;
	}

	protected getHandlers(): any {
		return Handlers;
	}

	public async boot(): Promise<void> {}

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
			{
				plugin: Plugins.rpcResponseHandler,
			},
		];
	}

	protected getActions(): Contracts.Api.RPC.Action[] {
		return [
			this.app.resolve(CallAction),
			this.app.resolve(EthGasPriceAction),
			this.app.resolve(EthBlockNumberAction),
			this.app.resolve(EthChainIdAction),
			this.app.resolve(EthEstimateGasAction),
			this.app.resolve(EthGetBalanceAction),
			this.app.resolve(EthGetBlockByHashAction),
			this.app.resolve(EthGetBlockByNumberAction),
			this.app.resolve(EthGetBlockTransactionCountByHash),
			this.app.resolve(EthGetBlockTransactionCountByNumber),
			this.app.resolve(EthGetCodeAction),
			this.app.resolve(EthGetStorageAtAction),
			this.app.resolve(EthGetTransactionByBlockHashAndIndex),
			this.app.resolve(EthGetTransactionByBlockNumberAndIndex),
			this.app.resolve(EthGetTransactionByHash),
			this.app.resolve(EthGetTransactionCount),
			this.app.resolve(EthGetTransactionReceipt),
			this.app.resolve(EthGetUncleByBlockHashAndIndex),
			this.app.resolve(EthGetUncleByBlockNumberAndIndex),
			this.app.resolve(EthGetUncleCountByBlockHash),
			this.app.resolve(EthGetUncleCountByBlockNumber),
			this.app.resolve(EthSendRawTransactionAction),
			this.app.resolve(NetListeningAction),
			this.app.resolve(NetPeerCountAction),
			this.app.resolve(NetVersion),
			this.app.resolve(Web3ClientVersionAction),
			this.app.resolve(Web3Sha3),
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

import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Providers, Types } from "@arkecosystem/core-kernel";
import fastify, { FastifyInstance, FastifyRequest } from "fastify";
import { v4 } from "uuid";

import { constants } from "../constants";
import { GetBlocksController } from "./controllers/get-blocks";
import { GetCommonBlocksController } from "./controllers/get-common-blocks";
import { GetPeersController } from "./controllers/get-peers";
import { GetStatusController } from "./controllers/get-status";
import { PostBlockController } from "./controllers/post-block";
import { PostTransactionsController } from "./controllers/post-transactions";

// @TODO review the implementation
@injectable()
export class Server {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	#server: FastifyInstance;
	#name: string;
	#options: Types.JsonObject;
	#address: string;

	public async initialize(name: string, options: Types.JsonObject): Promise<void> {
		this.#name = name;
		this.#options = options;

		this.#server = fastify({
			bodyLimit: 2_097_152,
			disableRequestLogging: true,
			genReqId: () => v4(),
			logger: false,
		});

		await this.#server.register(require("fastify-compress"));

		await this.#server.register(require("fastify-response-validation"));

		await this.#server.register(require("fastify-rate-limit"), {
			max: 1000,
			timeWindow: "1 minute",
		});

		await this.#server.register(require("fastify-helmet"));

		await this.#server.register(require("fastify-sensible"));

		this.#registerRoutes();
	}

	public async boot(): Promise<void> {
		try {
			// @ts-ignore
			this.#address = await this.#server.listen(this.#options.port, this.#options.hostname);

			this.logger.info(`${this.#name} server listening on ${this.#address}`);
		} catch {
			await this.app.terminate(`Failed to start ${this.#name}!`);
		}
	}

	public async dispose(): Promise<void> {
		try {
			await this.#server.close();

			this.logger.info(`Terminated ${this.#name} server listening on ${this.#address}`);
		} catch {
			await this.app.terminate(`Failed to stop ${this.#name}!`);
		}
	}

	#registerRoutes(): void {
		this.#server.get(
			"/blocks",
			{
				bodyLimit: 1024,
				schema: {
					headers: {
						properties: {
							version: { type: "string" },
						},
						type: "object",
					},
					querystring: {
						properties: {
							blockLimit: { maximum: 400, minimum: 1, type: "integer" },
							headersOnly: { type: "boolean" },
							lastBlockHeight: { minimum: 1, type: "integer" },
							serialized: { type: "boolean" },
						},
						type: "object",
					},
				},
			},
			async (request: FastifyRequest) => this.app.resolve(GetBlocksController).invoke(request),
		);

		this.#server.post(
			"/blocks",
			{
				bodyLimit: constants.DEFAULT_MAX_PAYLOAD,
				schema: {
					body: {
						properties: {
							block: { pattern: "^[0123456789A-Fa-f]+$", type: "string" },
						},
						type: "object",
					},
					headers: {
						properties: {
							version: { type: "string" },
						},
						type: "object",
					},
				},
			},
			async (request: FastifyRequest) => this.app.resolve(PostBlockController).invoke(request),
		);

		this.#server.get(
			"/blocks/common",
			{
				bodyLimit: 10 * 1024,
				schema: {
					headers: {
						properties: {
							version: { type: "string" },
						},
						type: "object",
					},
					querystring: {
						properties: {
							ids: { items: { blockId: {} }, maxItems: 10, minItems: 1, type: "array" },
						},
						type: "object",
					},
				},
			},
			async (request: FastifyRequest) => this.app.resolve(GetCommonBlocksController).invoke(request),
		);

		this.#server.get(
			"/peers",
			{
				bodyLimit: 1024,
				schema: {
					headers: {
						properties: {
							version: { type: "string" },
						},
						type: "object",
					},
				},
			},
			async (request: FastifyRequest) => this.app.resolve(GetPeersController).invoke(request),
		);

		this.#server.get(
			"/status",
			{
				bodyLimit: 1024,
				schema: {
					headers: {
						properties: {
							version: { type: "string" },
						},
						type: "object",
					},
				},
			},
			async (request: FastifyRequest) => this.app.resolve(GetStatusController).invoke(request),
		);

		this.#server.post(
			"/transactions",
			{
				bodyLimit: constants.DEFAULT_MAX_PAYLOAD,
				schema: {
					body: {
						properties: {
							transactions: {
								maxItems: this.app
									.getTagged<Providers.PluginConfiguration>(
										Identifiers.PluginConfiguration,
										"plugin",
										"core-transaction-pool",
									)
									.getOptional<number>("maxTransactionsPerRequest", 40),
								type: "array",
							},
						},
						type: "object",
					},
					headers: {
						properties: {
							version: { type: "string" },
						},
						type: "object",
					},
				},
			},
			async (request: FastifyRequest) => this.app.resolve(PostTransactionsController).invoke(request),
		);
	}
}

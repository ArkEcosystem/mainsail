import { randomBytes } from "crypto";
import { Types, Utils } from "@arkecosystem/core-kernel";
import { badData } from "@hapi/boom";
import Boom from "@hapi/boom";
import { Server as HapiServer, ServerInjectOptions, ServerInjectResponse } from "@hapi/hapi";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { injectable, inject } from "@arkecosystem/core-container";

import { Database } from "../database";
import { InternalIdentifiers } from "../identifiers";
import { Webhook } from "../interfaces";
import { whitelist } from "./plugins/whitelist";
import { destroy, show, store, update } from "./schema";
import { respondWithResource } from "./utils";

@injectable()
export class Server {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(InternalIdentifiers.Database)
	private readonly database!: Database;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	private server: HapiServer;

	public async register(optionsServer: Types.JsonObject): Promise<void> {
		this.server = new HapiServer(this.getServerOptions(optionsServer));
		this.server.app.database = this.database;

		this.server.ext({
			async method(request, h) {
				request.headers["content-type"] = "application/json";

				return h.continue;
			},
			type: "onPreHandler",
		});

		await this.registerPlugins(optionsServer);

		await this.registerRoutes();
	}

	public async boot(): Promise<void> {
		try {
			await this.server.start();

			this.logger.info(`Webhook Server started at ${this.server.info.uri}`);
		} catch (error) {
			await this.app.terminate(`Failed to start Webhook Server!`, error);
		}
	}

	public async dispose(): Promise<void> {
		try {
			await this.server.stop();

			this.logger.info(`Webhook Server stopped at ${this.server.info.uri}`);
		} catch (error) {
			await this.app.terminate(`Failed to stop Webhook Server!`, error);
		}
	}

	public async inject(options: string | ServerInjectOptions): Promise<ServerInjectResponse> {
		return this.server.inject(options);
	}

	private getServerOptions(options: Record<string, any>): object {
		options = {
			...options.http,
			whitelist: options.whitelist,
		};

		delete options.http;
		delete options.enabled;
		delete options.whitelist;

		return {
			router: {
				stripTrailingSlash: true,
			},
			routes: {
				/* c8 ignore next 3 */
				payload: {
					async failAction(request, h, error) {
						return badData(error.message);
					},
				},
				/* c8 ignore next 3 */
				validate: {
					async failAction(request, h, error) {
						return badData(error.message);
					},
				},
			},
			...options,
		};
	}

	private async registerPlugins(config: Types.JsonObject): Promise<void> {
		await this.server.register({
			options: {
				whitelist: config.whitelist,
			},
			plugin: whitelist,
		});
	}

	private registerRoutes(): void {
		this.server.route({
			handler() {
				return { data: "Hello World!" };
			},
			method: "GET",
			path: "/",
		});

		this.server.route({
			handler: (request) => ({
				data: request.server.app.database.all().map((webhook) => {
					webhook = { ...webhook };
					delete webhook.token;
					return webhook;
				}),
			}),
			method: "GET",
			path: "/api/webhooks",
		});

		this.server.route({
			handler(request: any, h) {
				const token: string = randomBytes(32).toString("hex");

				return h
					.response(
						respondWithResource({
							...request.server.app.database.create({
								...request.payload,
								token: token.slice(0, 32),
							}),
							token,
						}),
					)
					.code(201);
			},
			method: "POST",
			options: {
				plugins: {
					pagination: {
						enabled: false,
					},
				},
				validate: store,
			},
			path: "/api/webhooks",
		});

		this.server.route({
			async handler(request) {
				if (!request.server.app.database.hasById(request.params.id)) {
					return Boom.notFound();
				}

				const webhook: Webhook | undefined = Utils.cloneDeep(
					request.server.app.database.findById(request.params.id),
				);

				/* c8 ignore next 3 */
				if (!webhook) {
					return Boom.badImplementation();
				}

				delete webhook.token;

				return respondWithResource(webhook);
			},
			method: "GET",
			options: {
				validate: show,
			},
			path: "/api/webhooks/{id}",
		});

		this.server.route({
			handler: (request, h) => {
				if (!request.server.app.database.hasById(request.params.id)) {
					return Boom.notFound();
				}

				request.server.app.database.update(request.params.id, request.payload as Webhook);

				return h.response().code(204);
			},
			method: "PUT",
			options: {
				validate: update,
			},
			path: "/api/webhooks/{id}",
		});

		this.server.route({
			handler: (request, h) => {
				if (!request.server.app.database.hasById(request.params.id)) {
					return Boom.notFound();
				}

				request.server.app.database.destroy(request.params.id);

				return h.response().code(204);
			},
			method: "DELETE",
			options: {
				validate: destroy,
			},
			path: "/api/webhooks/{id}",
		});
	}
}

import { badData } from "@hapi/boom";
import { Server as HapiServer, ServerInjectOptions, ServerInjectResponse, ServerRoute } from "@hapi/hapi";
import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Utils } from "@mainsail/kernel";
import { readFileSync } from "fs";

import * as Schemas from "./schemas";

// todo: review the implementation
@injectable()
export class Server {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "api-development")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	private server!: HapiServer<any>;

	private name!: string;

	public get uri(): string {
		return this.server.info.uri;
	}

	public async initialize(name: string, optionsServer: Contracts.Types.JsonObject): Promise<void> {
		this.name = name;
		this.server = new HapiServer(this.getServerOptions(optionsServer));

		const timeout: number = this.configuration.getRequired<number>("plugins.socketTimeout");
		this.server.listener.timeout = timeout;
		this.server.listener.keepAliveTimeout = timeout;
		this.server.listener.headersTimeout = timeout;

		this.server.app.app = this.app;
		this.server.app.schemas = Schemas;

		this.server.ext("onPreHandler", (request, h) => {
			request.headers["content-type"] = "application/json";
			return h.continue;
		});

		this.server.ext("onPreResponse", (request, h) => {
			if ("isBoom" in request.response && request.response.isServer) {
				this.logger.error(request.response.stack);
			}
			return h.continue;
		});

		this.server.route({
			handler() {
				return { data: "Hello World!" };
			},
			method: "GET",
			path: "/",
		});
	}

	public async boot(): Promise<void> {
		try {
			await this.server.start();

			this.logger.info(`${this.name} Server started at ${this.server.info.uri}`);
		} catch (error) {
			await this.app.terminate(`Failed to start ${this.name} Server!`, error);
		}
	}

	public async dispose(): Promise<void> {
		try {
			await this.server.stop();

			this.logger.info(`${this.name} Server stopped at ${this.server.info.uri}`);
		} catch (error) {
			await this.app.terminate(`Failed to stop ${this.name} Server!`, error);
		}
	}

	// @todo: add proper types
	public async register(plugins: any | any[]): Promise<void> {
		return this.server.register(plugins);
	}

	public async route(routes: ServerRoute | ServerRoute[]): Promise<void> {
		return this.server.route(routes);
	}

	public getRoute(method: string, path: string): ServerRoute | undefined {
		return this.server.table().find((route) => route.method === method.toLowerCase() && route.path === path);
	}

	public async inject(options: string | ServerInjectOptions): Promise<ServerInjectResponse> {
		return this.server.inject(options);
	}

	private getServerOptions(options: Record<string, any>): object {
		options = { ...options };

		delete options.enabled;

		if (options.tls) {
			options.tls.key = readFileSync(options.tls.key).toString();
			options.tls.cert = readFileSync(options.tls.cert).toString();
		}

		const validateContext = {
			configuration: {
				plugins: {
					pagination: {
						limit: this.configuration.getRequired<number>("plugins.pagination.limit"),
					},
				},
			},
		};

		const defaultOptions = {
			router: {
				stripTrailingSlash: true,
			},
			routes: {
				payload: {
					/* istanbul ignore next */
					async failAction(request, h, error) {
						return badData(error.message);
					},
				},
				validate: {
					/* istanbul ignore next */
					async failAction(request, h, error) {
						return badData(error.message);
					},

					options: {
						context: validateContext,
					},
				},
			},
		};

		return Utils.merge(defaultOptions, options);
	}
}

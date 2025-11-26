import Boom from "@hapi/boom";
import {
	Server as HapiServer,
	Plugin,
	ServerInjectOptions,
	ServerInjectResponse,
	ServerRegisterPluginObject,
	ServerRoute,
} from "@hapi/hapi";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { merge } from "@mainsail/utils";
import { readFileSync } from "fs";

import { Processor } from "./rcp/index.js";

@injectable()
export abstract class AbstractServer {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

	private server!: Contracts.Api.ApiServer;

	protected abstract baseName(): string;
	private serverType!: Contracts.Api.ServerType;

	public get prettyName(): string {
		return `${this.baseName()} (${this.serverType})`;
	}

	public get uri(): string {
		return this.server.info.uri;
	}

	public async initialize(type: Contracts.Api.ServerType, optionsServer: Contracts.Types.JsonObject): Promise<void> {
		this.server = new HapiServer(this.getServerOptions(optionsServer));

		this.serverType = type;

		const timeout: number = this.pluginConfiguration().getRequired<number>("plugins.socketTimeout");
		this.server.listener.timeout = timeout;
		this.server.listener.keepAliveTimeout = timeout;
		this.server.listener.headersTimeout = timeout;

		this.server.app.app = this.app;
		this.server.app.rpc = this.app.resolve(Processor);

		this.server.ext("onPreHandler", (request, h) => {
			request.headers["content-type"] = "application/json";
			return h.continue;
		});

		this.server.ext("onPreResponse", (request, h) => {
			if ("isBoom" in request.response && request.response.isBoom && request.response.isServer) {
				if (request.response.name === "QueryFailedError") {
					const message = `${request.response.name} ${request.response.message}`;
					this.logger.warn(`${request.path} - ${message}`);
					request.response = Boom.badRequest(message);
				} else {
					this.logger.error(`${request.path} - ${request.response.stack ?? request.response.message}`);
				}
			}
			return h.continue;
		});

		const helloWorld = `Hello World from ${this.baseName()}!`;

		this.server.route({
			handler() {
				return { data: helloWorld };
			},
			method: "GET",
			path: "/",
		});
	}

	public async boot(): Promise<void> {
		try {
			await this.server.start();

			this.logger.info(`${this.prettyName} Server started at ${this.server.info.uri}`);
		} catch (error) {
			await this.app.terminate(`Failed to start ${this.prettyName} Server!`, error);
		}
	}

	public async dispose(): Promise<void> {
		try {
			await this.server.stop();

			this.logger.info(`${this.prettyName} Server stopped at ${this.server.info.uri}`);
		} catch (error) {
			await this.app.terminate(`Failed to stop ${this.prettyName} Server!`, error);
		}
	}

	public async registerPlugins<T = unknown>(plugins: Plugin<T>[]): Promise<void> {
		await this.server.register(plugins);
	}

	public async registerHandlers<T = unknown>(plugins: ServerRegisterPluginObject<T>): Promise<void> {
		return this.server.register(plugins);
	}

	public async route(routes: ServerRoute | ServerRoute[]): Promise<void> {
		return this.server.route(routes);
	}

	public getRoute(method: string, path: string): ServerRoute | undefined {
		return this.server.table().find((route) => route.method === method.toLowerCase() && route.path === path);
	}

	public getRPCProcessor(): Contracts.Api.RPC.Processor {
		return this.server.app.rpc;
	}

	public async inject(options: string | ServerInjectOptions): Promise<ServerInjectResponse> {
		return this.server.inject(options);
	}

	protected abstract pluginConfiguration(): Contracts.Kernel.PluginConfiguration;
	protected abstract defaultOptions(): Record<string, unknown>;

	private getServerOptions(options: Record<string, unknown>): object {
		options = { ...options };

		delete options.enabled;

		if (options.tls && options.tls["key"]) {
			options.tls["key"] = readFileSync(options.tls["key"]).toString();
			options.tls["cert"] = readFileSync(options.tls["cert"]).toString();
		}

		options.debug = false;

		const defaultOptions = this.defaultOptions();
		return merge(defaultOptions, options);
	}
}

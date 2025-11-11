import { Server as HapiServer, ServerInjectOptions, ServerInjectResponse, ServerRoute } from "@hapi/hapi";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable, multiInject } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { constants } from "../constants.js";
import { plugin as hapiNesPlugin } from "../hapi-nes/index.js";
import {
	AcceptPeerPlugin,
	CodecPlugin,
	HeaderHandlePlugin,
	HeaderIncludePlugin,
	RateLimitPlugin,
	StatisticPlugin,
	ValidateDataPlugin,
	ValidateIpPlugin,
} from "./plugins/index.js";

@injectable()
export class Server implements Contracts.P2P.Server {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@multiInject(Identifiers.P2P.Routes)
	private readonly routes!: Contracts.P2P.Route[];

	private server!: HapiServer;

	private name!: string;

	public async initialize(name: string, optionsServer: { hostname: string; port: number }): Promise<void> {
		this.name = name;

		const address = optionsServer.hostname;
		const port = Number(optionsServer.port);

		this.server = new HapiServer({ address, debug: { request: "*" }, port });
		this.server.app = this.app;
		await this.server.register({
			options: {
				maxPayload: constants.MAX_PAYLOAD_SERVER,
			},
			plugin: hapiNesPlugin,
		});

		for (const route of this.routes) {
			route.register(this.server);
		}

		// onRequest
		this.app.resolve(StatisticPlugin).register(this.server);

		// onPreAuth
		this.app.resolve(ValidateIpPlugin).register(this.server);
		this.app.resolve(RateLimitPlugin).register(this.server);

		// onPostAuth
		this.app.resolve(CodecPlugin).register(this.server);
		this.app.resolve(ValidateDataPlugin).register(this.server);

		// onPreHandler
		this.app.resolve(AcceptPeerPlugin).register(this.server);
		this.app.resolve(HeaderHandlePlugin).register(this.server);

		// onPostHandler
		this.app.resolve(HeaderIncludePlugin).register(this.server);
	}

	public async boot(): Promise<void> {
		try {
			await this.server.start();
			this.logger.info(`${this.name} started at ${this.server.info.uri}`, "p2p");
		} catch (error) {
			await this.app.terminate(`Failed to start ${this.name} Server!`, error);
		}
	}

	public async dispose(): Promise<void> {
		try {
			await this.server.stop();
			this.logger.info(`${this.name} stopped at ${this.server.info.uri}`, "p2p");
		} catch (error) {
			await this.app.terminate(`Failed to stop ${this.name} Server!`, error);
		}
	}

	// @todo: add proper types
	public async register(plugins: any): Promise<void> {
		await this.server.register(plugins);
	}

	public async route(routes: ServerRoute | ServerRoute[]): Promise<void> {
		this.server.route(routes);
	}

	public async inject(options: string | ServerInjectOptions): Promise<ServerInjectResponse> {
		return this.server.inject(options);
	}
}

import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Types } from "@mainsail/core-kernel";
import { Server as HapiServer, ServerInjectOptions, ServerInjectResponse, ServerRoute } from "@hapi/hapi";

import { plugin as hapiNesPlugin } from "../hapi-nes";
import { AcceptPeerPlugin } from "./plugins/accept-peer";
import { AwaitBlockPlugin } from "./plugins/await-block";
import { CodecPlugin } from "./plugins/codec";
import { IsAppReadyPlugin } from "./plugins/is-app-ready";
import { RateLimitPlugin } from "./plugins/rate-limit";
import { ValidatePlugin } from "./plugins/validate";
import {
	GetBlocksRoute,
	GetCommonBlocksRoute,
	GetPeersRoute,
	GetStausRoute,
	PostBlockRoute,
	PostTransactionsRoute,
} from "./routes";

// todo: review the implementation
@injectable()
export class Server {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	private server!: HapiServer;

	private name!: string;

	public async initialize(name: string, optionsServer: Types.JsonObject): Promise<void> {
		this.name = name;

		const address = optionsServer.hostname;
		const port = Number(optionsServer.port);

		this.server = new HapiServer({ address, port });
		this.server.app = this.app;
		await this.server.register({
			options: {
				maxPayload: 20_971_520, // 20 MB TODO to adjust
			},
			plugin: hapiNesPlugin,
		});

		this.app.resolve(GetBlocksRoute).register(this.server);
		this.app.resolve(GetCommonBlocksRoute).register(this.server);
		this.app.resolve(GetPeersRoute).register(this.server);
		this.app.resolve(GetStausRoute).register(this.server);
		this.app.resolve(PostBlockRoute).register(this.server);
		this.app.resolve(PostTransactionsRoute).register(this.server);

		// onPreAuth
		this.app.resolve(RateLimitPlugin).register(this.server);
		this.app.resolve(AwaitBlockPlugin).register(this.server);

		// onPostAuth
		this.app.resolve(CodecPlugin).register(this.server);
		this.app.resolve(ValidatePlugin).register(this.server);
		this.app.resolve(IsAppReadyPlugin).register(this.server);

		// onPreHandler
		this.app.resolve(AcceptPeerPlugin).register(this.server);
	}

	public async boot(): Promise<void> {
		try {
			await this.server.start();
			this.logger.info(`${this.name} started at ${this.server.info.uri}`);
		} catch {
			await this.app.terminate(`Failed to start ${this.name}!`);
		}
	}

	public async dispose(): Promise<void> {
		try {
			await this.server.stop();
			this.logger.info(`${this.name} stopped at ${this.server.info.uri}`);
		} catch {
			await this.app.terminate(`Failed to stop ${this.name}!`);
		}
	}

	// @todo: add proper types
	public async register(plugins: any | any[]): Promise<void> {
		await this.server.register(plugins);
	}

	public async route(routes: ServerRoute | ServerRoute[]): Promise<void> {
		await this.server.route(routes);
	}

	public async inject(options: string | ServerInjectOptions): Promise<ServerInjectResponse> {
		await this.server.inject(options);
	}
}

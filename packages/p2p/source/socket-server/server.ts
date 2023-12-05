import { Server as HapiServer, ServerInjectOptions, ServerInjectResponse, ServerRoute } from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { constants } from "../constants";
import { plugin as hapiNesPlugin } from "../hapi-nes";
import { AcceptPeerPlugin } from "./plugins/accept-peer";
import { CodecPlugin } from "./plugins/codec";
import { HeaderHandlePlugin } from "./plugins/header-handle";
import { HeaderIncludePlugin } from "./plugins/header-include";
import { RateLimitPlugin } from "./plugins/rate-limit";
import { ValidatePlugin } from "./plugins/validate";
import {
	GetApiNodesRoute,
	GetBlocksRoute,
	GetMessagesRoute,
	GetPeersRoute,
	GetProposalRoute,
	GetStatusRoute,
	PostPrecommitRoute,
	PostPrevoteRoute,
	PostProposalRoute,
	PostTransactionsRoute,
} from "./routes";

// todo: review the implementation
@injectable()
export class Server implements Contracts.P2P.Server {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	private server!: HapiServer;

	private name!: string;

	public async initialize(name: string, optionsServer: { hostname: string; port: number }): Promise<void> {
		this.name = name;

		const address = optionsServer.hostname;
		const port = Number(optionsServer.port);

		this.server = new HapiServer({ address, port });
		this.server.app = this.app;
		await this.server.register({
			options: {
				maxPayload: constants.MAX_PAYLOAD_SERVER,
			},
			plugin: hapiNesPlugin,
		});

		this.app.resolve(GetBlocksRoute).register(this.server);
		this.app.resolve(GetMessagesRoute).register(this.server);
		this.app.resolve(GetPeersRoute).register(this.server);
		this.app.resolve(GetApiNodesRoute).register(this.server);
		this.app.resolve(GetProposalRoute).register(this.server);
		this.app.resolve(GetStatusRoute).register(this.server);
		this.app.resolve(PostPrecommitRoute).register(this.server);
		this.app.resolve(PostPrevoteRoute).register(this.server);
		this.app.resolve(PostProposalRoute).register(this.server);
		this.app.resolve(PostTransactionsRoute).register(this.server);

		// onPreAuth
		this.app.resolve(RateLimitPlugin).register(this.server);

		// onPostAuth
		this.app.resolve(CodecPlugin).register(this.server);
		this.app.resolve(ValidatePlugin).register(this.server);

		// onPreHandler
		this.app.resolve(AcceptPeerPlugin).register(this.server);
		this.app.resolve(HeaderHandlePlugin).register(this.server);

		// onPostHandler
		this.app.resolve(HeaderIncludePlugin).register(this.server);
	}

	public async boot(): Promise<void> {
		try {
			await this.server.start();
			this.logger.info(`${this.name} started at ${this.server.info.uri}`);
		} catch (error) {
			await this.app.terminate(`Failed to start ${this.name} Server!`, error);
		}
	}

	public async dispose(): Promise<void> {
		try {
			await this.server.stop();
			this.logger.info(`${this.name} stopped at ${this.server.info.uri}`);
		} catch (error) {
			await this.app.terminate(`Failed to stop ${this.name} Server!`, error);
		}
	}

	// @todo: add proper types
	public async register(plugins: any | any[]): Promise<void> {
		await this.server.register(plugins);
	}

	public async route(routes: ServerRoute | ServerRoute[]): Promise<void> {
		this.server.route(routes);
	}

	public async inject(options: string | ServerInjectOptions): Promise<ServerInjectResponse> {
		return this.server.inject(options);
	}
}

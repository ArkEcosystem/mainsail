import type WebSocket from "ws";

import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";
import {
	Connection,
	type ConnectionFactory,
	type ConnectionOptions,
	Dialer,
	Listener,
	Server,
	type ServerOptions,
} from "@mainsail/p2p-websocket";
import Joi from "joi";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind<ConnectionFactory>(Identifiers.P2P.WebSocket.Connection.Factory)
			.toFactory(
				() => (ws: WebSocket, options: ConnectionOptions) => this.app.resolve(Connection).init(ws, options),
			);
		this.app.bind(Identifiers.P2P.WebSocket.Listener).to(Listener).inSingletonScope();
		this.app.bind(Identifiers.P2P.WebSocket.Dialer).to(Dialer).inSingletonScope();
		this.app.bind(Identifiers.P2P.Server).to(Server).inSingletonScope();
	}

	// Only prepares the server. Listening is started by the bootstrapper via Server.boot()
	// once the node state is ready to answer peers.
	public async boot(): Promise<void> {
		this.app
			.get<Server>(Identifiers.P2P.Server)
			.initialize("P2P Server", this.config().getRequired<ServerOptions>("server"));
	}

	public async dispose(): Promise<void> {
		await this.app.get<Server>(Identifiers.P2P.Server).dispose();
	}

	public configSchema(): Joi.AnySchema {
		return Joi.object({
			server: Joi.object({
				hostname: Joi.string()
					.ip({ version: ["ipv4", "ipv6"] })
					.required(),
				port: Joi.number().integer().min(1).max(65_535).required(),
			}).required(),
		}).unknown(true);
	}
}

import type WebSocket from "ws";

import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";
import Joi from "joi";

import { BanList } from "./ban-list.js";
import { ConnectionRepository } from "./connection-repository.js";
import { Connection, type ConnectionFactory, type ConnectionOptions } from "./connection.js";
import { Dialer } from "./dialer.js";
import { Listener } from "./listener.js";
import { Logger } from "./logger.js";
import { Server, type ServerOptions } from "./server.js";
import { Service } from "./service.js";

// Binds the transport. Register it before the package that owns the server lifecycle.
@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.P2P.WebSocket.Logger).to(Logger).inSingletonScope();
		this.app.bind(Identifiers.P2P.WebSocket.BanList).to(BanList).inSingletonScope();
		this.app.bind(Identifiers.P2P.WebSocket.Connection.Repository).to(ConnectionRepository).inSingletonScope();

		// Verifiers run in this order at accept time: the cheapest, most definitive check first.
		this.app.bind(Identifiers.P2P.WebSocket.Connection.Verifiers).toService(Identifiers.P2P.WebSocket.BanList);
		this.app
			.bind(Identifiers.P2P.WebSocket.Connection.Verifiers)
			.toService(Identifiers.P2P.WebSocket.Connection.Repository);

		this.app
			.bind<ConnectionFactory>(Identifiers.P2P.WebSocket.Connection.Factory)
			.toFactory(
				() => (ws: WebSocket, options: ConnectionOptions) => this.app.resolve(Connection).init(ws, options),
			);
		this.app.bind(Identifiers.P2P.WebSocket.Listener).to(Listener).inSingletonScope();
		this.app.bind(Identifiers.P2P.WebSocket.Dialer).to(Dialer).inSingletonScope();
		this.app.bind(Identifiers.P2P.WebSocket.Server).to(Server).inSingletonScope();
		this.app.bind(Identifiers.P2P.WebSocket.Service).to(Service).inSingletonScope();
	}

	// Only prepares the server. Listening is started by the bootstrapper via Service.boot()
	// once the node state is ready to answer peers.
	public async boot(): Promise<void> {
		this.app
			.get<Service>(Identifiers.P2P.WebSocket.Service)
			.initialize("P2P Server", this.config().getRequired<ServerOptions>("server"));
	}

	public async dispose(): Promise<void> {
		await this.app.get<Service>(Identifiers.P2P.WebSocket.Service).dispose();
	}

	public configSchema(): Joi.AnySchema {
		return Joi.object({
			logger: Joi.object({
				enabled: Joi.bool().required(),
			}).required(),
			server: Joi.object({
				hostname: Joi.string()
					.ip({ version: ["ipv4", "ipv6"] })
					.required(),
				port: Joi.number().integer().min(1).max(65_535).required(),
			}).required(),
		}).unknown(true);
	}
}

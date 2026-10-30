import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";
import { once } from "node:events";
import { createServer, type Server as HttpServer } from "node:http";

import type { ConnectionRepository } from "./connection-repository.js";
import type { Listener } from "./listener.js";

import { CloseReason } from "./enums.js";

// Owns the HTTP server and its lifecycle; the listener only accepts upgrades on it.
// initialize() is called by the service provider, boot() and dispose() by the bootstrapper.
const NAME = "P2P Server";

@injectable()
export class Server {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p-websocket")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	@inject(Identifiers.P2P.WebSocket.Listener)
	private readonly listener!: Listener;

	@inject(Identifiers.P2P.WebSocket.Connection.Repository)
	private readonly repository!: ConnectionRepository;

	#hostname!: string;
	#port!: number;
	#http!: HttpServer;

	public initialize(): void {
		this.#hostname = this.configuration.getRequired<string>("server.hostname");
		this.#port = this.configuration.getRequired<number>("server.port");
		this.#http = this.#createHttpServer();
		this.listener.initialize(this.#http);
	}

	public async boot(): Promise<void> {
		try {
			this.listener.start();
			await this.#listen();
			this.logger.info(`${NAME} started at ${this.#hostname}:${this.#port}`, "p2p");
		} catch (rawError) {
			await this.listener.stop();
			await this.app.terminate(`Failed to start ${NAME}!`, ensureError(rawError));
		}
	}

	public async dispose(): Promise<void> {
		try {
			await this.listener.stop();
			// The listener closed the inbound side; whatever is left was dialed by us.
			await Promise.all(this.repository.all().map((connection) => connection.close(CloseReason.Shutdown)));
			await this.#close();
			this.logger.info(`${NAME} stopped at ${this.#hostname}:${this.#port}`, "p2p");
		} catch (rawError) {
			this.app.fail(`Failed to stop ${NAME}!`, ensureError(rawError));
		}
	}

	// Serves nothing over plain HTTP; only the WebSocket upgrade is accepted.
	#createHttpServer(): HttpServer {
		return createServer((_, response) => {
			response.writeHead(426, { Connection: "close", Upgrade: "websocket" }).end();
		});
	}

	// Resolves once the server is listening; `once` rejects with the listen error (busy port, EACCES, ...).
	async #listen(): Promise<void> {
		this.#http.listen(this.#port, this.#hostname);
		await once(this.#http, "listening");
	}

	// Resolves once the port is released. Idle keep-alive connections are dropped so this does not hang.
	async #close(): Promise<void> {
		if (!this.#http.listening) {
			return;
		}

		this.#http.close();
		this.#http.closeIdleConnections();
		await once(this.#http, "close");
	}
}

import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";
import { once } from "node:events";
import { createServer, type Server as HttpServer } from "node:http";

import { Listener } from "./listener.js";

export type ServerOptions = {
	hostname: string;
	port: number;
};

// Owns the HTTP server and its lifecycle; the listener only accepts upgrades on it.
// initialize() is called by the service provider, boot() and dispose() by the bootstrapper.
@injectable()
export class Server {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	#name!: string;
	#options!: ServerOptions;
	#http!: HttpServer;
	#listener!: Listener;

	public initialize(name: string, options: ServerOptions): void {
		this.#name = name;
		this.#options = options;
		this.#http = this.#createHttpServer();
		this.#listener = new Listener({ server: this.#http });
	}

	public get listener(): Listener {
		return this.#listener;
	}

	public async boot(): Promise<void> {
		try {
			this.#listener.start();
			await this.#listen();
			this.logger.info(`${this.#name} started at ${this.#options.hostname}:${this.#options.port}`, "p2p");
		} catch (rawError) {
			await this.#listener.stop();
			await this.app.terminate(`Failed to start ${this.#name}!`, ensureError(rawError));
		}
	}

	public async dispose(): Promise<void> {
		try {
			await this.#listener.stop();
			await this.#close();
			this.logger.info(`${this.#name} stopped at ${this.#options.hostname}:${this.#options.port}`, "p2p");
		} catch (rawError) {
			this.app.fail(`Failed to stop ${this.#name}!`, ensureError(rawError));
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
		this.#http.listen(this.#options.port, this.#options.hostname);
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

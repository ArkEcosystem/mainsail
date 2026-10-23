import type { Contracts } from "@mainsail/contracts";
import type { Server as HttpServer } from "node:http";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";

import { constants } from "./constants.js";
import { close, createHttpServer, listen } from "./http-server.js";
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
		this.#http = createHttpServer();
		this.#listener = new Listener({
			handshakeTimeout: constants.HANDSHAKE_TIMEOUT,
			maxPayload: constants.MAX_PAYLOAD,
			server: this.#http,
			version: constants.PROTOCOL_VERSION,
		});
	}

	public get listener(): Listener {
		return this.#listener;
	}

	public async boot(): Promise<void> {
		try {
			this.#listener.start();
			await listen(this.#http, { host: this.#options.hostname, port: this.#options.port });
			this.logger.info(`${this.#name} started at ${this.#options.hostname}:${this.#options.port}`, "p2p");
		} catch (rawError) {
			await this.#listener.stop();
			await this.app.terminate(`Failed to start ${this.#name}!`, ensureError(rawError));
		}
	}

	public async dispose(): Promise<void> {
		try {
			await this.#listener.stop();
			await close(this.#http);
			this.logger.info(`${this.#name} stopped at ${this.#options.hostname}:${this.#options.port}`, "p2p");
		} catch (rawError) {
			this.app.fail(`Failed to stop ${this.#name}!`, ensureError(rawError));
		}
	}
}

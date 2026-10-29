import type { Contracts } from "@mainsail/contracts";
import type { Connection, Service as WebSocketService } from "@mainsail/p2p-websocket";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";

import { Codecs } from "./codecs/index.js";

const HELLO_INTERVAL = 1000;

type Seed = { ip: string; port: number };

// Keeps a connection to every seed in peers.json and, every second, says hello to each one and asks for its status.
// Enough to watch the transport work between two real nodes; discovery and peers come later.
@injectable()
export class Service {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.P2P.WebSocket.Service)
	private readonly websocket!: WebSocketService;

	readonly #connections = new Map<string, Connection>();

	#seeds: Seed[] = [];
	#timer?: NodeJS.Timeout;
	#counter = 0;

	public async boot(): Promise<void> {
		// TEMPORARY: the same seeds as the old p2p, shifted to the port the new transport listens on.
		this.#seeds = (this.app.config<{ list: Seed[] }>("peers")?.list ?? []).map((seed) => ({
			ip: seed.ip,
			port: Number(seed.port) + 1,
		}));

		this.websocket.onConnection = (connection) => this.#track(connection);
		await this.websocket.boot();

		this.#timer = setInterval(() => void this.#tick(), HELLO_INTERVAL);
	}

	public async dispose(): Promise<void> {
		clearInterval(this.#timer);
		await this.websocket.dispose();
	}

	async #tick(): Promise<void> {
		await Promise.all(this.#seeds.map((seed) => this.#dialIfMissing(seed)));

		this.#counter += 1;
		for (const connection of this.#connections.values()) {
			void this.#hello(connection);
			void this.#getStatus(connection);
		}
	}

	async #dialIfMissing(seed: Seed): Promise<void> {
		if (this.#connections.has(seed.ip)) {
			return;
		}

		try {
			this.#track(await this.websocket.dial(`ws://${seed.ip}:${seed.port}`));
		} catch (rawError) {
			this.logger.info(`Dial to ${seed.ip}:${seed.port} failed: ${ensureError(rawError).message}`, "p2p");
		}
	}

	#track(connection: Connection): void {
		this.#connections.set(connection.remoteAddress, connection);
		connection.onClose(() => {
			if (this.#connections.get(connection.remoteAddress) === connection) {
				this.#connections.delete(connection.remoteAddress);
			}
		});
	}

	async #hello(connection: Connection): Promise<void> {
		const started = Date.now();

		try {
			const response = await connection.request("hello", Buffer.from(`hello #${this.#counter}`));
			this.logger.info(
				`${connection.direction} ${connection.remoteAddress}: ${response.statusCode} "${response.payload.toString()}" in ${Date.now() - started} ms`,
				"p2p",
			);
		} catch (rawError) {
			this.logger.warn(`hello to ${connection.remoteAddress} failed: ${ensureError(rawError).message}`, "p2p");
		}
	}

	async #getStatus(connection: Connection): Promise<void> {
		const started = Date.now();

		try {
			const response = await connection.request("getStatus", Codecs.getStatus.request.serialize({}));
			if (response.statusCode !== 200) {
				this.logger.warn(`getStatus from ${connection.remoteAddress} answered ${response.statusCode}`, "p2p");
				return;
			}

			const { state } = Codecs.getStatus.response.deserialize(response.payload);
			this.logger.info(
				`${connection.direction} ${connection.remoteAddress}: block ${state?.blockNumber} ${state?.blockHash} in ${Date.now() - started} ms`,
				"p2p",
			);
		} catch (rawError) {
			this.logger.warn(
				`getStatus from ${connection.remoteAddress} failed: ${ensureError(rawError).message}`,
				"p2p",
			);
		}
	}
}

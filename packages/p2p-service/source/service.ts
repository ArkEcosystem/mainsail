import type { Contracts } from "@mainsail/contracts";
import type { Interfaces, Service as WebSocketService } from "@mainsail/p2p-websocket";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";

import { GetStatus } from "./routes/index.js";

const HELLO_INTERVAL = 1000;

type Seed = { ip: string; port: number };

// Keeps a connection to every seed in peers.json and asks each one for its status every second.
// Enough to watch the transport work between two real nodes; discovery and peers come later.
@injectable()
export class Service {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.P2P.WebSocket.Service)
	private readonly websocket!: WebSocketService;

	readonly #connections = new Map<string, Interfaces.Connection>();

	#seeds: Seed[] = [];
	#timer?: NodeJS.Timeout;

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

		for (const connection of this.#connections.values()) {
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

	#track(connection: Interfaces.Connection): void {
		this.#connections.set(connection.remoteAddress, connection);
		connection.onClose(() => {
			if (this.#connections.get(connection.remoteAddress) === connection) {
				this.#connections.delete(connection.remoteAddress);
			}
		});
	}

	async #getStatus(connection: Interfaces.Connection): Promise<void> {
		const started = Date.now();

		try {
			const { state } = await connection.send(GetStatus, {});
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

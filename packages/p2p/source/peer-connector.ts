import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { IpAddress } from "@mainsail/utils";
import delay from "delay";

import { Client } from "./hapi-nes/index.js";

const TEN_SECONDS = 10 * 1000; // in milliseconds

@injectable()
export class PeerConnector implements Contracts.P2P.PeerConnector {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2P.Logger;

	readonly #connections = new Map<string, Promise<Client>>();
	readonly #lastConnectionCreate = new Map<string, number>();

	public async connect(peer: Contracts.P2P.Peer): Promise<Client> {
		let connection = this.#connections.get(peer.ip);

		if (!connection) {
			connection = this.#create(peer);
			this.#connections.set(peer.ip, connection);

			connection.catch(() => {
				// Only evict our own entry; disconnect() may already have replaced it.
				if (this.#connections.get(peer.ip) === connection) {
					this.#connections.delete(peer.ip);
				}
			});
		}

		return connection;
	}

	public async disconnect(ip: string): Promise<void> {
		const connection = this.#connections.get(ip);
		if (!connection) {
			return;
		}

		this.#connections.delete(ip);

		const client = await connection.catch(() => undefined);
		await client?.terminate();
	}

	public async emit(
		peer: Contracts.P2P.Peer,
		event: string,
		payload: Buffer,
		timeout?: number,
	): Promise<{ payload: Buffer }> {
		const connection: Client = await this.connect(peer);

		if (timeout) {
			connection.setTimeout(timeout);
		}

		const options = {
			headers: {},
			method: "POST",
			path: event,
			payload,
		};

		return connection.request(options);
	}

	async #create(peer: Contracts.P2P.Peer): Promise<Client> {
		// delay a bit if last connection create was less than 10 sec ago to prevent possible abuse of reconnection
		const timeSinceLastConnectionCreate = Date.now() - (this.#lastConnectionCreate.get(peer.ip) ?? 0);
		await delay(Math.max(0, TEN_SECONDS - timeSinceLastConnectionCreate));

		const connection = new Client(`ws://${IpAddress.normalizeAddress(peer.ip)}:${peer.port}`, {
			timeout: 10_000,
		});
		this.#lastConnectionCreate.set(peer.ip, Date.now());

		connection.onDisconnect = () => {
			this.logger.debug(`Disconnected from peer ${peer.ip}`);

			const peerDisposer = this.app.get<Contracts.P2P.PeerDisposer>(Identifiers.P2P.Peer.Disposer);
			peerDisposer.disposePeer(peer.ip);
		};

		connection.onError = (error) => {
			this.app.get<Contracts.P2P.PeerDisposer>(Identifiers.P2P.Peer.Disposer).banPeer(peer.ip, error);
		};

		await connection.connect({ reconnect: false });

		return connection;
	}
}

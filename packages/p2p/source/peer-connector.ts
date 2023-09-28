import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import delay from "delay";

import { Client } from "./hapi-nes";

const TEN_SECONDS_IN_MILLISECONDS = 10_000;

@injectable()
export class PeerConnector implements Contracts.P2P.PeerConnector {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	private readonly connections: Map<string, Client> = new Map<string, Client>();
	readonly #lastConnectionCreate: Map<string, number> = new Map<string, number>();

	public all(): Client[] {
		return [...this.connections].map(([key, value]) => value);
	}

	public connection(peer: Contracts.P2P.Peer): Client | undefined {
		const connection: Client | undefined = this.connections.get(`${peer.ip}`);

		return connection;
	}

	public async connect(peer: Contracts.P2P.Peer): Promise<Client> {
		if (!this.connection(peer)) {
			// delay a bit if last connection create was less than 10 sec ago to prevent possible abuse of reconnection
			const timeSinceLastConnectionCreate = Date.now() - (this.#lastConnectionCreate.get(peer.ip) ?? 0);
			if (timeSinceLastConnectionCreate < TEN_SECONDS_IN_MILLISECONDS) {
				await delay(TEN_SECONDS_IN_MILLISECONDS - timeSinceLastConnectionCreate);
			}
		}
		return this.connection(peer) || (await this.create(peer));
	}

	public disconnect(peer: Contracts.P2P.Peer): void {
		const connection = this.connection(peer);

		if (connection) {
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			connection.terminate();

			this.connections.delete(`${peer.ip}`);
		}

		const timeSinceLastConnectionCreate = Date.now() - (this.#lastConnectionCreate.get(peer.ip) ?? 0);
		setTimeout(
			() => {
				if (!this.connection(peer)) {
					this.#lastConnectionCreate.delete(peer.ip);
				}
			},
			Math.max(TEN_SECONDS_IN_MILLISECONDS - timeSinceLastConnectionCreate, 0), // always between 0-10 seconds
		);
	}

	public async emit(peer: Contracts.P2P.Peer, event: string, payload: any, timeout?: number): Promise<any> {
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

	private async create(peer: Contracts.P2P.Peer): Promise<Client> {
		const connection = new Client(`ws://${Utils.IpAddress.normalizeAddress(peer.ip)}:${peer.port}`, {
			timeout: 10_000,
		});
		this.connections.set(peer.ip, connection);
		this.#lastConnectionCreate.set(peer.ip, Date.now());

		connection.onError = (error) => {
			this.app.get<Contracts.P2P.PeerDisposer>(Identifiers.PeerDisposer).banPeer(peer.ip, error);
		};

		await connection.connect({ retries: 1, timeout: 5000 });

		return connection;
	}
}

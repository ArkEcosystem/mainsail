import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import delay from "delay";

import { Client } from "./hapi-nes/index.js";

const TEN_SECONDS_IN_MILLISECONDS = 10_000;

@injectable()
export class PeerConnector implements Contracts.P2P.PeerConnector {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	private readonly connections: Map<string, Client> = new Map<string, Client>();
	readonly #lastConnectionCreate: Map<string, number> = new Map<string, number>();

	public async connect(peer: Contracts.P2P.Peer): Promise<Client> {
		return this.connections.get(peer.ip) || (await this.#create(peer));
	}

	public async disconnect(ip: string): Promise<void> {
		const connection = this.connections.get(ip);

		if (connection) {
			await connection.terminate();
			this.connections.delete(ip);
		}
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

	async #create(peer: Contracts.P2P.Peer): Promise<Client> {
		// delay a bit if last connection create was less than 10 sec ago to prevent possible abuse of reconnection
		const timeSinceLastConnectionCreate = Date.now() - (this.#lastConnectionCreate.get(peer.ip) ?? 0);
		await delay(Math.max(0, TEN_SECONDS_IN_MILLISECONDS - timeSinceLastConnectionCreate));

		const connection = new Client(`ws://${Utils.IpAddress.normalizeAddress(peer.ip)}:${peer.port}`, {
			timeout: 10_000,
		});
		this.connections.set(peer.ip, connection);
		this.#lastConnectionCreate.set(peer.ip, Date.now());

		connection.onError = (error) => {
			this.app.get<Contracts.P2P.PeerDisposer>(Identifiers.P2P.Peer.Disposer).banPeer(peer.ip, error);
		};

		await connection.connect({ reconnect: false });

		return connection;
	}
}

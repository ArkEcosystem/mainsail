import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { IpAddress } from "@mainsail/utils";
import delay from "delay";

import { Client, errorTypes, NesError } from "./hapi-nes/index.js";

const TEN_SECONDS = 10 * 1000; // in milliseconds

class Connection {
	public client?: Client;
	public readonly controller = new AbortController();
	public promise!: Promise<Client>;
}

@injectable()
export class PeerConnector implements Contracts.P2P.PeerConnector {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2P.Logger;

	readonly #connections = new Map<string, Connection>();
	readonly #lastConnectionCreate = new Map<string, number>();

	public async connect(peer: Contracts.P2P.Peer): Promise<Client> {
		return this.#connections.get(peer.ip)?.promise ?? this.#create(peer);
	}

	public async disconnect(ip: string): Promise<void> {
		const connection = this.#connections.get(ip);
		if (!connection) {
			return;
		}

		this.#connections.delete(ip);

		connection.controller.abort();
		await connection.client?.terminate();
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
		const connection = new Connection();
		connection.promise = this.#open(peer, connection);
		this.#connections.set(peer.ip, connection);

		try {
			return await connection.promise;
		} catch (error) {
			if (this.#connections.get(peer.ip) === connection) {
				this.#connections.delete(peer.ip);
			}

			throw error;
		}
	}

	async #open(peer: Contracts.P2P.Peer, connection: Connection): Promise<Client> {
		const { signal } = connection.controller;

		// delay a bit if last connection create was less than 10 sec ago to prevent possible abuse of reconnection
		const timeSinceLastConnectionCreate = Date.now() - (this.#lastConnectionCreate.get(peer.ip) ?? 0);
		await delay(Math.max(0, TEN_SECONDS - timeSinceLastConnectionCreate), { signal }).catch(() => {});

		if (signal.aborted) {
			throw NesError(`Connection to peer ${peer.ip} cancelled while connecting`, errorTypes.DISCONNECT);
		}

		const client = new Client(`ws://${IpAddress.normalizeAddress(peer.ip)}:${peer.port}`, {
			timeout: 10_000,
		});
		connection.client = client;
		this.#lastConnectionCreate.set(peer.ip, Date.now());

		client.onDisconnect = () => {
			this.logger.debug(`Disconnected from peer ${peer.ip}`);

			const peerDisposer = this.app.get<Contracts.P2P.PeerDisposer>(Identifiers.P2P.Peer.Disposer);
			peerDisposer.disposePeer(peer.ip);
		};

		client.onError = (error) => {
			this.app.get<Contracts.P2P.PeerDisposer>(Identifiers.P2P.Peer.Disposer).banPeer(peer.ip, error);
		};

		// Without a timeout a black-holed address waits for the kernel TCP timeout (minutes).
		await client.connect({ reconnect: false, timeout: TEN_SECONDS });

		return client;
	}
}

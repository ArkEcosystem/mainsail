import type { Contracts } from "@mainsail/contracts";
import type { ConnectionRepository, Interfaces, Service as WebSocketService } from "@mainsail/p2p-websocket";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ConnectionState } from "@mainsail/p2p-websocket";
import { ensureError, IpAddress } from "@mainsail/utils";
import { setTimeout as sleep } from "node:timers/promises";

import type { Peer } from "./interfaces/index.js";

import { constants } from "./constants.js";
import { GetBlocks, GetMessages, GetProposal, GetStatus, PostMessage, PostProposal } from "./routes/index.js";

const DIAL_SPACING = 10_000;

// Minimal port of the @mainsail/p2p communicator over the new transport: no timeouts per route,
// no reply validation, no throttling, no banning. Peers are trusted for now.
@injectable()
export class PeerCommunicator implements Contracts.P2P.PeerCommunicator {
	@inject(Identifiers.P2P.WebSocket.Service)
	private readonly websocketService!: WebSocketService;

	@inject(Identifiers.P2P.WebSocket.Connection.Repository)
	private readonly connections!: ConnectionRepository;

	@inject(Identifiers.P2P.Header.Factory)
	private readonly headerFactory!: Contracts.P2P.HeaderFactory;

	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2P.Logger;

	public async postProposal(peer: Peer, proposal: Buffer): Promise<void> {
		try {
			await this.#emit(peer, PostProposal, { proposal });
		} catch (rawError) {
			this.logger.debug(`postProposal to ${peer.ip} failed: ${ensureError(rawError).message}`, "p2p");
		}
	}

	public async postMessage(peer: Peer, message: Buffer): Promise<void> {
		try {
			await this.#emit(peer, PostMessage, { message });
		} catch (rawError) {
			this.logger.debug(`postMessage to ${peer.ip} failed: ${ensureError(rawError).message}`, "p2p");
		}
	}

	public async getStatus(peer: Peer): Promise<Contracts.P2P.GetStatusResponse> {
		return (await this.#emit(peer, GetStatus, {})) as unknown as Contracts.P2P.GetStatusResponse;
	}

	public async getBlocks(
		peer: Peer,
		{ fromBlockNumber, limit = constants.MAX_DOWNLOAD_BLOCKS }: { fromBlockNumber: number; limit?: number },
	): Promise<Contracts.P2P.GetBlocksResponse> {
		return (await this.#emit(peer, GetBlocks, {
			fromBlockNumber,
			limit,
		})) as unknown as Contracts.P2P.GetBlocksResponse;
	}

	public async getProposal(
		peer: Peer,
		query: Contracts.P2P.GetProposalQuery,
	): Promise<Contracts.P2P.GetProposalResponse> {
		return (await this.#emit(peer, GetProposal, { query })) as unknown as Contracts.P2P.GetProposalResponse;
	}

	public async getMessages(
		peer: Peer,
		query: Contracts.P2P.GetMessagesQuery,
	): Promise<Contracts.P2P.GetMessagesResponse> {
		return (await this.#emit(peer, GetMessages, { query })) as unknown as Contracts.P2P.GetMessagesResponse;
	}

	public async getPeers(): Promise<Contracts.P2P.GetPeersResponse> {
		throw new Error("getPeers is not ported to @mainsail/p2p-service yet");
	}

	public async getApiNodes(): Promise<Contracts.P2P.GetApiNodesResponse> {
		throw new Error("API nodes are not part of @mainsail/p2p-service");
	}

	public async pingPorts(): Promise<void> {
		throw new Error("pingPorts is not ported to @mainsail/p2p-service yet");
	}

	async #emit<TRequest extends { headers?: unknown }, TResponse>(
		peer: Peer,
		route: Interfaces.RouteDefinition<TRequest, TResponse>,
		payload: Omit<TRequest, "headers">,
	): Promise<TResponse> {
		const connection = await this.#connect(peer);

		return connection.send(route, { ...payload, headers: this.headerFactory().toData() } as TRequest);
	}

	// Reuses the peer's connection in either direction; dials only when there is none, at most once per DIAL_SPACING.
	async #connect(peer: Peer): Promise<Interfaces.Connection> {
		if (peer.connection?.state === ConnectionState.Open) {
			return peer.connection;
		}

		const existing = this.connections.get(peer.ip);
		if (existing) {
			this.#attach(peer, existing);
			return existing;
		}

		const wait = DIAL_SPACING - (Date.now() - (peer.lastDialAt ?? 0));
		if (wait > 0) {
			await sleep(wait);
		}

		peer.lastDialAt = Date.now();
		const connection = await this.websocketService.dial(`ws://${IpAddress.normalizeAddress(peer.ip)}:${peer.port}`);
		this.#attach(peer, connection);

		return connection;
	}

	#attach(peer: Peer, connection: Interfaces.Connection): void {
		if (peer.connection === connection) {
			return;
		}

		peer.connection = connection;
		connection.onClose(() => {
			if (peer.connection === connection) {
				peer.connection = undefined;
			}
		});
	}
}

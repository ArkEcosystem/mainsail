import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { CloseReason, ConnectionError, ConnectionState } from "@mainsail/p2p-websocket";
import { ensureError } from "@mainsail/utils";

import type { Peer } from "./interfaces/index.js";

import { constants } from "./constants.js";
import {
	GetApiNodes,
	GetBlocks,
	GetMessages,
	GetPeers,
	GetProposal,
	GetStatus,
	PostMessage,
	PostProposal,
} from "./routes/index.js";

// Port of the @mainsail/p2p communicator over the new transport, without throttling. The responses are
// checked against the schema of their route by ValidateSendMiddleware. Every request waits the
// transport's REQUEST_TIMEOUT for its response, except for a batch of blocks. It never connects: a peer
// without an open connection is not an active peer, and the service loop dials known peers.
@injectable()
export class PeerCommunicator implements Contracts.P2PService.PeerCommunicator {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p-service")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	@inject(Identifiers.P2P.Peer.Disposer)
	private readonly peerDisposer!: Contracts.P2PService.PeerDisposer;

	@inject(Identifiers.P2P.Header.Service)
	private readonly headerService!: Contracts.P2PService.HeaderService;

	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2PService.Logger;

	public async postProposal(peer: Peer, proposal: Buffer): Promise<void> {
		try {
			await this.#emit(peer, PostProposal, { proposal });
		} catch (rawError) {
			this.peerDisposer.banPeer(peer.ip, ensureError(rawError));
		}
	}

	public async postMessage(peer: Peer, message: Buffer): Promise<void> {
		try {
			await this.#emit(peer, PostMessage, { message });
		} catch (rawError) {
			this.peerDisposer.banPeer(peer.ip, ensureError(rawError));
		}
	}

	public async getStatus(peer: Peer): Promise<Contracts.P2PService.GetStatusResponse> {
		return (await this.#emit(peer, GetStatus, {})) as unknown as Contracts.P2PService.GetStatusResponse;
	}

	// A batch of blocks is the one response that takes longer than a round trip; its timeout is configured.
	// A single block, which the verifier asks a new peer for, is no larger than a proposal and gets the
	// transport's timeout like every other request.
	public async getBlocks(
		peer: Peer,
		{ fromBlockNumber, limit = constants.MAX_DOWNLOAD_BLOCKS }: { fromBlockNumber: number; limit?: number },
	): Promise<Contracts.P2PService.GetBlocksResponse> {
		const options: Interfaces.SendOptions =
			limit > 1 ? { timeout: this.configuration.getRequired<number>("getBlocksTimeout") } : {};

		return (await this.#emit(
			peer,
			GetBlocks,
			{ fromBlockNumber, limit },
			options,
		)) as unknown as Contracts.P2PService.GetBlocksResponse;
	}

	public async getProposal(
		peer: Peer,
		query: Contracts.P2PService.GetProposalQuery,
	): Promise<Contracts.P2PService.GetProposalResponse> {
		return (await this.#emit(peer, GetProposal, { query })) as unknown as Contracts.P2PService.GetProposalResponse;
	}

	public async getMessages(
		peer: Peer,
		query: Contracts.P2PService.GetMessagesQuery,
	): Promise<Contracts.P2PService.GetMessagesResponse> {
		return (await this.#emit(peer, GetMessages, { query })) as unknown as Contracts.P2PService.GetMessagesResponse;
	}

	public async getPeers(peer: Peer): Promise<Contracts.P2PService.GetPeersResponse> {
		this.logger.debug(`Fetching a fresh peer list from ${peer.ip}`, "p2p");

		return (await this.#emit(peer, GetPeers, {})) as unknown as Contracts.P2PService.GetPeersResponse;
	}

	// Asked on behalf of @mainsail/p2p-api-nodes; a peer without that plugin answers with an empty list.
	public async getApiNodes(peer: Peer): Promise<Contracts.P2PService.GetApiNodesResponse> {
		this.logger.debug(`Fetching API nodes from ${peer.ip}`, "p2p");

		return (await this.#emit(peer, GetApiNodes, {})) as unknown as Contracts.P2PService.GetApiNodesResponse;
	}

	async #emit<TRequest extends { headers?: unknown }, TResponse>(
		peer: Peer,
		route: Interfaces.RouteDefinition<TRequest, TResponse>,
		payload: Omit<TRequest, "headers">,
		options: Interfaces.SendOptions = {},
	): Promise<TResponse> {
		const connection = this.#connection(peer);

		// The request headers are added by HeaderIncludeSendMiddleware.
		const started = performance.now();
		const response = await connection.send(route, payload as TRequest, options);
		peer.setLatency(Math.floor(performance.now() - started));

		// The wire type of the headers is the protobuf shape; the contract shape is what the codec unpacks,
		// and the schema of every route requires it.
		const { headers } = response as { headers: Contracts.P2PService.HeaderData };
		this.headerService.handle(peer, headers);

		return response;
	}

	#connection(peer: Peer): Interfaces.Connection {
		if (peer.connection?.state !== ConnectionState.Open) {
			throw new ConnectionError(CloseReason.NotOpen, `No open connection to ${peer.ip}`);
		}

		return peer.connection;
	}
}

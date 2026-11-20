import type { Contracts } from "@mainsail/contracts";
import type { Service as WebSocketService } from "@mainsail/p2p-websocket";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError, IpAddress } from "@mainsail/utils";

import type { Peer } from "./interfaces/index.js";

import { constants } from "./constants.js";

// Dials new addresses, learned from other peers, with a bounded number of dials in flight. Known peers
// are not its business: the service loop dials those, spaced out and counted.
@injectable()
export class DialQueue implements Contracts.P2PService.DialQueue {
	@inject(Identifiers.P2P.WebSocket.Service)
	private readonly websocketService!: WebSocketService;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly repository!: Contracts.P2PService.PeerRepository;

	@inject(Identifiers.P2P.Peer.Factory)
	private readonly peerFactory!: (ip: string) => Peer;

	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2PService.Logger;

	// A Set keeps insertion order, so the addresses are dialed first in, first out.
	readonly #queued = new Set<string>();
	readonly #dialing = new Set<string>();
	#disposed = false;

	public add(rawIp: string): void {
		const ip = IpAddress.sanitizeRemoteAddress(rawIp);
		if (!ip || this.repository.hasPeer(ip)) {
			return;
		}

		if (this.#disposed || this.#queued.has(ip) || this.#dialing.has(ip)) {
			return;
		}

		if (this.#queued.size >= constants.MAX_QUEUED_DIALS) {
			return;
		}

		this.#queued.add(ip);
		this.#next();
	}

	// Dials in flight end by themselves when the transport is disposed.
	public dispose(): void {
		this.#disposed = true;
		this.#queued.clear();
	}

	// Starts one dial when a slot is free. Called for every address added and every dial that ended, so
	// the slots stay full while addresses wait.
	#next(): void {
		if (this.#dialing.size >= constants.MAX_CONCURRENT_DIALS) {
			return;
		}

		const [ip] = this.#queued;
		if (ip === undefined) {
			return;
		}

		this.#queued.delete(ip);
		this.#dialing.add(ip);

		void this.#dial(ip);
	}

	async #dial(ip: string): Promise<void> {
		try {
			// The address may have become a peer while it waited, by connecting to us.
			if (!this.repository.hasPeer(ip)) {
				await this.websocketService.dial(this.peerFactory(ip).socketUrl);
			}
		} catch (rawError) {
			this.logger.debug(`Dial to ${ip} failed: ${ensureError(rawError).message}`, "p2p");
		} finally {
			this.#dialing.delete(ip);
			this.#next();
		}
	}
}

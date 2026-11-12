import type { Contracts } from "@mainsail/contracts";
import type { Service as WebSocketService } from "@mainsail/p2p-websocket";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { CloseReason, ConnectionError } from "@mainsail/p2p-websocket";
import dayjs from "dayjs";

// Failures of the connection itself, not of the peer's behaviour: the peer is dropped but not banned.
// Mirrors the WS, DISCONNECT and TIMEOUT nes errors of @mainsail/p2p.
const DISPOSE_REASONS = new Set<CloseReason>([
	CloseReason.SocketError,
	CloseReason.RemoteClose,
	CloseReason.RequestTimeout,
	CloseReason.HandshakeTimeout,
	CloseReason.NotOpen,
]);

@injectable()
export class PeerDisposer implements Contracts.P2P.PeerDisposer {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p-service")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	@inject(Identifiers.P2P.WebSocket.Service)
	private readonly websocketService!: WebSocketService;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.TransactionPool.Worker)
	private readonly transactionPoolWorker!: Contracts.TransactionPool.Worker;

	// The ban list of the transport is the single record of bans; it also refuses banned sockets.
	public banPeer(ip: string, error: Error): void {
		if (this.isBanned(ip)) {
			return;
		}

		if (error instanceof ConnectionError && DISPOSE_REASONS.has(error.reason)) {
			this.logger.debug(`Disposing peer ${ip}, because: ${error.message}`, "p2p");
			this.disposePeer(ip);

			return;
		}

		this.logger.debug(`Banning peer ${ip}, because: ${error.message}`, "p2p");

		const timeout = this.configuration.getRequired<number>("peerBanTime");
		if (timeout > 0) {
			this.websocketService.ban(ip, dayjs().add(timeout, "minute").valueOf());
		}

		this.disposePeer(ip);
	}

	public disposePeer(ip: string): void {
		void this.websocketService.disconnect(ip);

		if (this.repository.hasPeer(ip)) {
			const peer = this.repository.getPeer(ip);

			this.repository.forgetPeer(peer);

			void this.events.dispatch(Events.PeerEvent.Removed, peer);
			void this.transactionPoolWorker.forgetPeer(ip);
		}
	}

	public async disposePeers(): Promise<void> {
		await Promise.all(this.repository.getPendingPeers().map((peer) => this.websocketService.disconnect(peer.ip)));
		await Promise.all(this.repository.getPeers().map((peer) => this.websocketService.disconnect(peer.ip)));
	}

	public isBanned(ip: string): boolean {
		return this.websocketService.isBanned(ip);
	}

	public bannedPeers(): { ip: string; timeout: number }[] {
		const now = Date.now();

		return this.websocketService.bans().map(({ ip, until }) => ({ ip, timeout: until - now }));
	}
}

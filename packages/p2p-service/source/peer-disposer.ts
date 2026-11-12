import type { Contracts } from "@mainsail/contracts";
import type { Service as WebSocketService } from "@mainsail/p2p-websocket";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { ConnectionError } from "@mainsail/p2p-websocket";
import dayjs from "dayjs";

@injectable()
export class PeerDisposer implements Contracts.P2PService.PeerDisposer {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p-service")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	@inject(Identifiers.P2P.WebSocket.Service)
	private readonly websocketService!: WebSocketService;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly repository!: Contracts.P2PService.PeerRepository;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	// The ban list of the transport is the single record of bans; it also refuses banned sockets.
	// A failure of the connection itself (closed, timed out, refused) is not the peer's doing: the peer is
	// only disposed, as it was for the nes WS, DISCONNECT and TIMEOUT errors. Anything else is a ban.
	public banPeer(ip: string, error: Error): void {
		if (this.isBanned(ip)) {
			return;
		}

		if (error instanceof ConnectionError) {
			// Every request in flight fails when a connection goes; the first failure disposes, the rest are noise.
			if (this.repository.hasActivePeer(ip) || this.repository.hasPendingPeer(ip)) {
				this.logger.debug(`Disposing peer ${ip}, because: ${error.message}`, "p2p");
				this.disposePeer(ip);
			}

			return;
		}

		this.logger.debug(`Banning peer ${ip}, because: ${error.message}`, "p2p");

		const timeout = this.configuration.getRequired<number>("peerBanTime");
		if (timeout > 0) {
			this.websocketService.ban(ip, dayjs().add(timeout, "minute").valueOf());
		}

		// Banned addresses are forgotten entirely: the service loop must not dial them.
		void this.websocketService.disconnect(ip);
		this.repository.removePeer(ip);
	}

	// Closes the connection; an active peer becomes known again so the service loop can dial it later.
	// Also runs when a connection closes by itself. The closed connection stays on the peer; everything
	// that sends checks that it is open.
	public disposePeer(ip: string): void {
		void this.websocketService.disconnect(ip);
		this.repository.demotePeer(ip);
	}

	public async disposePeers(): Promise<void> {
		await Promise.all(this.repository.getPendingPeers().map((peer) => this.websocketService.disconnect(peer.ip)));
		await Promise.all(this.repository.getActivePeers().map((peer) => this.websocketService.disconnect(peer.ip)));
	}

	public isBanned(ip: string): boolean {
		return this.websocketService.isBanned(ip);
	}

	public bannedPeers(): { ip: string; timeout: number }[] {
		const now = Date.now();

		return this.websocketService.bans().map(({ ip, until }) => ({ ip, timeout: until - now }));
	}
}

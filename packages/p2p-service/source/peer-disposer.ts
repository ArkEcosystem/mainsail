import type { Contracts } from "@mainsail/contracts";
import type { Service as WebSocketService } from "@mainsail/p2p-websocket";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { CloseReason, ConnectionError } from "@mainsail/p2p-websocket";
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
	// A failure of the connection itself is not the peer's doing and the transport has already closed
	// the connection, which disposes the peer through the close listener; only other errors ban.
	public banPeer(ip: string, error: Error): void {
		if (error instanceof ConnectionError) {
			return;
		}

		this.logger.debug(`Banning peer ${ip}, because: ${error.message}`, "p2p");

		const timeout = this.configuration.getRequired<number>("peerBanTime");
		if (timeout > 0) {
			this.websocketService.ban(ip, dayjs().add(timeout, "minute").valueOf());
		}

		// The ban terminated the connection; banned addresses are forgotten entirely, the loop must not dial them.
		this.repository.removePeer(ip);
	}

	// Closes the connection politely; an active peer becomes known again so the service loop can dial it
	// later. Also runs when a connection closes by itself. The closed connection stays on the peer;
	// everything that sends checks that it is open.
	public disposePeer(ip: string): void {
		void this.websocketService.disconnect(ip);
		this.repository.demotePeer(ip);
	}

	// Shutdown: a graceful close waits for every peer's closing handshake, up to the socket's own timeout
	// on a dead link, so the connections are torn down at once instead.
	public async disposePeers(): Promise<void> {
		for (const peer of [...this.repository.getPendingPeers(), ...this.repository.getActivePeers()]) {
			this.websocketService.terminate(peer.ip, CloseReason.Shutdown);
		}
	}

	public bannedPeers(): { ip: string; timeout: number }[] {
		const now = Date.now();

		return this.websocketService.bans().map(({ ip, until }) => ({ ip, timeout: until - now }));
	}
}

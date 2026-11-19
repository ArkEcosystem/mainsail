import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";

import type { ConnectionRepository } from "./connection-repository.js";
import type { ConnectionVerifier } from "./interfaces/index.js";

import { CloseReason, Direction } from "./enums.js";

// Bounds the connections of each direction, so that neither other nodes nor the addresses we learn can
// take up an unlimited number of sockets and peer slots. The two sides have separate limits: connections
// others open to us cannot use up the room for the peers we choose ourselves. The repository holds a
// connection from the moment it is accepted or dialed, so sockets still in their handshake count too.
// A refused dialer is told we are full, which unlike a rejection is no reason to forget our address.
@injectable()
export class ConnectionLimitVerifier implements ConnectionVerifier {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p-websocket")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	@inject(Identifiers.P2P.WebSocket.Connection.Repository)
	private readonly repository!: ConnectionRepository;

	public verify(_: string, direction: Direction): CloseReason | undefined {
		const limit = this.configuration.getRequired<number>(
			direction === Direction.Inbound ? "server.maxInboundConnections" : "server.maxOutboundConnections",
		);
		const connections = this.repository.all().filter((connection) => connection.direction === direction);

		return connections.length >= limit ? CloseReason.Full : undefined;
	}
}

import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";

import type { ConnectionRepository } from "./connection-repository.js";
import type { ConnectionVerifier } from "./interfaces/index.js";

import { CloseReason, Direction } from "./enums.js";

// Bounds the connections other nodes open to us, so that nobody can take up an unlimited number of
// sockets and peer slots. Connections we dialed do not count and are never refused here: a node whose
// inbound side is full must still be able to choose its own peers. The refused dialer is told we are
// full, which unlike a rejection is no reason to forget our address.
@injectable()
export class InboundLimitVerifier implements ConnectionVerifier {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p-websocket")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	@inject(Identifiers.P2P.WebSocket.Connection.Repository)
	private readonly repository!: ConnectionRepository;

	public verify(_: string, direction: Direction): CloseReason | undefined {
		if (direction !== Direction.Inbound) {
			return undefined;
		}

		const inbound = this.repository.all().filter((connection) => connection.direction === Direction.Inbound);

		return inbound.length >= this.configuration.getRequired<number>("server.maxInboundConnections")
			? CloseReason.Full
			: undefined;
	}
}

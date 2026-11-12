import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

// The contract plus the live transport connection, which @mainsail/contracts cannot name.
export interface Peer extends Contracts.P2PService.Peer {
	connection?: Interfaces.Connection;
	// Set by the service loop, which dials known peers: when we last dialed and how often it failed in a row.
	lastDialAt?: number;
	dialFailures?: number;
}

import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

// The contract plus the live transport connection, which @mainsail/contracts cannot name.
export interface Peer extends Contracts.P2P.Peer {
	connection?: Interfaces.Connection;
	// When we last dialed this peer; dials are spaced out so a peer that keeps dropping us is not hammered.
	lastDialAt?: number;
}

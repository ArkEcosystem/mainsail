import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

// The contract plus the live transport connection, which @mainsail/contracts cannot name.
export interface Peer extends Contracts.P2PService.Peer {
	connection?: Interfaces.Connection;
	// Kept for the service loop, which dials known peers: when we last dialed, and how many dials there
	// were since the peer was last active.
	lastDialAt: number;
	dialAttempts: number;
	// When the peer's header was last received, in either direction; the service loop asks a peer for its
	// status once this is too long ago.
	lastHeaderAt: number;
}

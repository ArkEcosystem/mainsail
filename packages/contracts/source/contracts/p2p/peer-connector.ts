import type { Client } from "./nes.js";
import type { Peer } from "./peer.js";

export interface PeerConnector {
	connect(peer: Peer): Promise<Client>;
	disconnect(ip: string): Promise<void>;

	emit(peer: Peer, event: string, payload: Buffer, timeout?: number): Promise<any>;
}

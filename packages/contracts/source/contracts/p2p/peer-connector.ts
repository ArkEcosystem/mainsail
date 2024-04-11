import { Client } from "./nes.js";
import { Peer } from "./peer.js";

export interface PeerConnector {
	connect(peer: Peer): Promise<Client>;
	disconnect(ip: string): Promise<void>;

	emit(peer: Peer, event: string, payload: any, timeout?: number): Promise<any>;
}

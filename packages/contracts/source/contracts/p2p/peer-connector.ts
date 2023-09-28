import { Client } from "./nes";
import { Peer } from "./peer";

export interface PeerConnector {
	connect(peer: Peer): Promise<Client>;
	disconnect(ip: string): Promise<void>;

	emit(peer: Peer, event: string, payload: any, timeout?: number): Promise<any>;
}

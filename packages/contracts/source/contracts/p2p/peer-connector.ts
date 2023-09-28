import { Client } from "./nes";
import { Peer } from "./peer";

export interface PeerConnector {
	all(): Client[];

	connection(peer: Peer): Client | undefined;

	connect(peer: Peer): Promise<Client>;

	disconnect(peer: Peer): void;

	emit(peer: Peer, event: string, payload: any, timeout?: number): Promise<any>;
}

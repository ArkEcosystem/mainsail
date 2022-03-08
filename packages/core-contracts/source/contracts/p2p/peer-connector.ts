import { Peer } from "./peer";

export interface PeerConnector {
	all(): string[];

	connect(peer: Peer, maxPayload?: number): Promise<void>;

	disconnect(peer: Peer): void;

	getError(peer: Peer): string | undefined;

	setError(peer: Peer, error: string): void;

	hasError(peer: Peer, error: string): boolean;

	forgetError(peer: Peer): void;
}

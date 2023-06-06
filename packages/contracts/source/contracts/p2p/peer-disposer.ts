import { Peer } from "./peer";

export interface PeerDisposer {
	dispose(peer: Peer): Promise<void>;
}

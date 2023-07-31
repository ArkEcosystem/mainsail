import { Peer } from "./peer";

export interface PeerVerifier {
	verify(peer: Peer): Promise<boolean>;
}

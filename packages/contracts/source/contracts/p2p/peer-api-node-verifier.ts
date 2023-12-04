import { PeerApiNode } from "./peer";

export interface PeerApiNodeVerifier {
	verify(apiNode: PeerApiNode): Promise<boolean>;
}

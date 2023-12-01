import { PeerApiNode, PeerApiNodes } from "./peer";

export interface PeerApiNodeRepository {
	getApiNodes(): PeerApiNodes;
	setApiNode(apiNode: PeerApiNode): void;
	forgetApiNode(apiNode: PeerApiNode): void;
}

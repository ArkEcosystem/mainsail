import { PeerApiNode, PeerApiNodes } from "./peer";

export interface PeerApiNodeRepository {
	getApiNodes(): PeerApiNodes;
	hasApiNode(apiNode: PeerApiNode): boolean;
	setApiNode(apiNode: PeerApiNode): void;
	forgetApiNode(apiNode: PeerApiNode): void;
	setPendingApiNode(apiNode: PeerApiNode): void;
	forgetPendingApiNode(apiNode: PeerApiNode): void;
	hasPendingApiNode(apiNode: PeerApiNode): boolean;
}

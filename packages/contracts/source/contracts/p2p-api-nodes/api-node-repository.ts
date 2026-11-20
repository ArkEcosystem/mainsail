import type { ApiNode, ApiNodeBroadcast } from "./api-node.js";

export interface ApiNodeRepository {
	getApiNodes(): ApiNode[];
	// The verified nodes with a public address, fastest first, as they are told to peers.
	getPublicApiNodes(): ApiNodeBroadcast[];
	hasApiNode(apiNode: ApiNode): boolean;
	setApiNode(apiNode: ApiNode): void;
	forgetApiNode(apiNode: ApiNode): void;
	setPendingApiNode(apiNode: ApiNode): void;
	forgetPendingApiNode(apiNode: ApiNode): void;
	hasPendingApiNode(apiNode: ApiNode): boolean;
}

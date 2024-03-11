import { ApiNode } from "./api-node.js";

export interface ApiNodeRepository {
	getApiNodes(): ApiNode[];
	hasApiNode(apiNode: ApiNode): boolean;
	setApiNode(apiNode: ApiNode): void;
	forgetApiNode(apiNode: ApiNode): void;
	setPendingApiNode(apiNode: ApiNode): void;
	forgetPendingApiNode(apiNode: ApiNode): void;
	hasPendingApiNode(apiNode: ApiNode): boolean;
}

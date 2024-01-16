import { ApiNode, ApiNodes } from "./peer";

export interface ApiNodeRepository {
	getApiNodes(): ApiNodes;
	hasApiNode(apiNode: ApiNode): boolean;
	setApiNode(apiNode: ApiNode): void;
	forgetApiNode(apiNode: ApiNode): void;
	setPendingApiNode(apiNode: ApiNode): void;
	forgetPendingApiNode(apiNode: ApiNode): void;
	hasPendingApiNode(apiNode: ApiNode): boolean;
}

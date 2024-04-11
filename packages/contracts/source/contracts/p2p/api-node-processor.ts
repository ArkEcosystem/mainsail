import { ApiNode } from "./api-node.js";

export interface AcceptNewApiNodeOptions {
	seed?: boolean;
}

export interface ApiNodeProcessor {
	validateAndAcceptApiNode(apiNode: ApiNode, options?: AcceptNewApiNodeOptions): Promise<void>;
}

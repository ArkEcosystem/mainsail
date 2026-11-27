import type { ApiNode } from "./api-node.js";

export interface AcceptNewApiNodeOptions {
	// A node from the configuration: the operator's choice, exempt from the public-address rule.
	seed?: boolean;
}

export interface ApiNodeProcessor {
	validateAndAcceptApiNode(apiNode: ApiNode, options?: AcceptNewApiNodeOptions): Promise<void>;

	revalidateApiNode(apiNode: ApiNode): Promise<void>;
}

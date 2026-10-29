import type { AcceptNewApiNodeOptions } from "./api-node-processor.js";
import type { ApiNode } from "./api-node.js";

export interface ApiNodeVerifier {
	verify(apiNode: ApiNode, options?: AcceptNewApiNodeOptions): Promise<boolean>;
}

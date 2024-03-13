import { ApiNode } from "./api-node.js";

export interface ApiNodeVerifier {
	verify(apiNode: ApiNode): Promise<boolean>;
}

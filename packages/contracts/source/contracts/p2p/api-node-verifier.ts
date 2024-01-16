import { ApiNode } from "./api-node";

export interface ApiNodeVerifier {
	verify(apiNode: ApiNode): Promise<boolean>;
}

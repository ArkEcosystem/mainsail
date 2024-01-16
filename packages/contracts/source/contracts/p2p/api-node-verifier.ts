import { ApiNode } from "./peer";

export interface ApiNodeVerifier {
	verify(apiNode: ApiNode): Promise<boolean>;
}

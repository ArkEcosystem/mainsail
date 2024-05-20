import { CommitHandler } from "../crypto/index.js";

export interface Client extends CommitHandler {
	getTransactionBytes(): Promise<Buffer[]>;
}

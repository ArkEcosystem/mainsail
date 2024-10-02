import { CommitHandler } from "../crypto/index.js";
export interface Client extends CommitHandler {
	getTransactionBytes(): Promise<Buffer[]>;
	getStatus(): Promise<{ height: number; version: string }>;
}

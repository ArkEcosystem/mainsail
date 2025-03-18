import { CommitHandler } from "./crypto/commit-handler.js";

export interface Service extends CommitHandler {
	bootstrap(): Promise<void>;
	beforeCommit(): Promise<void>;
	getLastSyncedBlockHeight(): Promise<number>;
}

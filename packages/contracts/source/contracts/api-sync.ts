import { CommitHandler } from "./crypto/commit.js";

export interface Service extends CommitHandler {
	bootstrap(): Promise<void>;
	beforeCommit(): Promise<void>;
	getLastSyncedBlockHeight(): Promise<number>;
}

import { CommitHandler } from "./crypto/commit.js";

export interface Service extends CommitHandler {
	prepareBootstrap(): Promise<void>;
	bootstrap(): Promise<void>;
	beforeCommit(): Promise<void>;
	getLastSyncedBlockHeight(): Promise<number>;
}

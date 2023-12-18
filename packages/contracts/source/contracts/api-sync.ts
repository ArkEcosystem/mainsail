import { CommitHandler } from "./crypto";

export interface Sync extends CommitHandler {
	prepareBootstrap(): Promise<void>;
	bootstrap(): Promise<void>;
	beforeCommit(): Promise<void>;
	getLastSyncedBlockHeight(): Promise<number>;
}

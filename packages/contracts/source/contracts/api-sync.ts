import { ICommitHandler } from "./crypto";

export interface ISync extends ICommitHandler {
	prepareBootstrap(): Promise<void>;
	bootstrap(): Promise<void>;
	beforeCommit(): Promise<void>;
	getLastSyncedBlockHeight(): Promise<number>;
}

import { ICommitHandler } from "./crypto";

export interface ISync extends ICommitHandler {
	bootstrap(): Promise<void>;
	beforeCommit(): Promise<void>;
}

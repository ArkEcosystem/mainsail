import { ICommittedBlock } from "./crypto";

export interface ISync {
	applyCommittedBlock(block: ICommittedBlock): Promise<void>;
}

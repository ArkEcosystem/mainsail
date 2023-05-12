import { IBlock } from "./crypto";

export enum ProcessorResult {
	Accepted,
	DiscardedButCanBeBroadcasted,
	Rejected,
	Rollback,
	Corrupted,
}

export interface Handler {
	execute(block?: IBlock): Promise<ProcessorResult>;
}

export interface Processor {
	process(block: IBlock): Promise<ProcessorResult>;
}

import { Interfaces } from "@arkecosystem/crypto";

export enum BlockProcessorResult {
	Accepted,
	DiscardedButCanBeBroadcasted,
	Rejected,
	Rollback,
	Reverted,
	Corrupted,
}

export interface BlockHandler {
	execute(block?: Interfaces.IBlock): Promise<BlockProcessorResult>;
}

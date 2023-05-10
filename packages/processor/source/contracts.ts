import { Contracts } from "@mainsail/contracts";

export enum BlockProcessorResult {
	Accepted,
	DiscardedButCanBeBroadcasted,
	Rejected,
	Rollback,
	Corrupted,
}

export interface BlockHandler {
	execute(block?: Contracts.Crypto.IBlock): Promise<BlockProcessorResult>;
}

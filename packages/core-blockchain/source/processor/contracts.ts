import { Contracts } from "@arkecosystem/core-contracts";

export enum BlockProcessorResult {
	Accepted,
	DiscardedButCanBeBroadcasted,
	Rejected,
	Rollback,
	Reverted,
	Corrupted,
}

export interface BlockHandler {
	execute(block?: Contracts.Crypto.IBlock): Promise<BlockProcessorResult>;
}

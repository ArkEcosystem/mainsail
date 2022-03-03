import { Contracts } from "@arkecosystem/core-contracts";

import { BlockProcessorResult } from "./block-processor";

export interface BlockHandler {
	execute(block?: Contracts.Crypto.IBlock): Promise<BlockProcessorResult>;
}

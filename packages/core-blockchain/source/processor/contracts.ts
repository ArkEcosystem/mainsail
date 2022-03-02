import { Crypto } from "@arkecosystem/core-contracts";

import { BlockProcessorResult } from "./block-processor";

export interface BlockHandler {
	execute(block?: Crypto.IBlock): Promise<BlockProcessorResult>;
}

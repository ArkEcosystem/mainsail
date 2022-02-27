import Interfaces from "@arkecosystem/core-crypto-contracts";

import { BlockProcessorResult } from "./block-processor";

export interface BlockHandler {
	execute(block?: Interfaces.IBlock): Promise<BlockProcessorResult>;
}

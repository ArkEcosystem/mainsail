import { Contracts } from "@mainsail/contracts";
import { Services, Types } from "@mainsail/kernel";

import { BlockProcessor } from "../block-processor";
import { BlockProcessorResult } from "../contracts";

export class ProcessBlockAction extends Services.Triggers.Action {
	public async execute(arguments_: Types.ActionArguments): Promise<BlockProcessorResult> {
		const blockProcessor: BlockProcessor = arguments_.blockProcessor;
		const block: Contracts.Crypto.IBlock = arguments_.block;

		return blockProcessor.process(block);
	}
}

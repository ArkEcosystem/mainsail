import { Services, Types } from "@arkecosystem/core-kernel";
import { Contracts } from "@arkecosystem/core-contracts";

import { BlockProcessor, BlockProcessorResult } from "../processor";

export class ProcessBlockAction extends Services.Triggers.Action {
	public async execute(arguments_: Types.ActionArguments): Promise<BlockProcessorResult> {
		const blockProcessor: BlockProcessor = arguments_.blockProcessor;
		const block: Contracts.Crypto.IBlock = arguments_.block;

		return blockProcessor.process(block);
	}
}

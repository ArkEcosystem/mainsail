import Interfaces from "@arkecosystem/core-crypto-contracts";
import { Services, Types } from "@arkecosystem/core-kernel";

import { BlockProcessor, BlockProcessorResult } from "../processor";

export class ProcessBlockAction extends Services.Triggers.Action {
	public async execute(arguments_: Types.ActionArguments): Promise<BlockProcessorResult> {
		const blockProcessor: BlockProcessor = arguments_.blockProcessor;
		const block: Interfaces.IBlock = arguments_.block;

		return blockProcessor.process(block);
	}
}

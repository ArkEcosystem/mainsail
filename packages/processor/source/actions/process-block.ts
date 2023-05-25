import { Contracts } from "@mainsail/contracts";
import { Services, Types } from "@mainsail/kernel";

export class ProcessBlockAction extends Services.Triggers.Action {
	public async execute(arguments_: Types.ActionArguments): Promise<boolean> {
		const blockProcessor: Contracts.BlockProcessor.Processor = arguments_.blockProcessor;
		const block: Contracts.Crypto.IBlock = arguments_.block;

		return blockProcessor.process(block);
	}
}

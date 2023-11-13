import { Contracts } from "@mainsail/contracts";
import { Services, Types } from "@mainsail/kernel";

export class ProcessBlockAction extends Services.Triggers.Action {
	public async execute(arguments_: Types.ActionArguments): Promise<boolean> {
		const blockProcessor: Contracts.Processor.BlockProcessor = arguments_.blockProcessor;
		const roundState: Contracts.Consensus.IRoundState = arguments_.roundState;

		return blockProcessor.process(roundState);
	}
}

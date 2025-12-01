import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { Services } from "@mainsail/kernel";

@injectable()
export class ProcessBlockAction extends Services.Triggers.Action {
	public async execute(
		arguments_: Contracts.Kernel.ActionArguments<{
			blockProcessor: Contracts.Processor.BlockProcessor;
			roundState: Contracts.Consensus.RoundState;
		}>,
	): Promise<Contracts.Processor.BlockProcessorResult> {
		const blockProcessor = arguments_.blockProcessor;
		const roundState = arguments_.roundState;

		return blockProcessor.process(roundState);
	}
}

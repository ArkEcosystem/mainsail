import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { Services } from "@mainsail/kernel";

@injectable()
export class ProcessBlockAction extends Services.Triggers.Action {
	public async execute(
		arguments_: Contracts.Kernel.ActionArguments,
	): Promise<Contracts.Processor.BlockProcessorResult> {
		const blockProcessor: Contracts.Processor.BlockProcessor = arguments_.blockProcessor;
		const roundState: Contracts.Consensus.RoundState = arguments_.roundState;

		return blockProcessor.process(roundState);
	}
}

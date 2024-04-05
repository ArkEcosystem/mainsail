import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class Selector implements Contracts.Proposer.Selector {
	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {}

	public getValidatorIndex(round: number): number {
		return 0;
	}
}

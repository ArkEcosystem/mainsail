import type { Contracts } from "@mainsail/contracts";

import { injectable } from "@mainsail/container";
import { InvalidBlockRound } from "@mainsail/exceptions";

@injectable()
export class RoundVerifier implements Contracts.Processor.Handler {
	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const block = unit.getBlock();

		if (block.round > unit.round) {
			throw new InvalidBlockRound(block, unit.round);
		}
	}
}

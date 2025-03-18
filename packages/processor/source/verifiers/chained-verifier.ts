import { isBlockChained } from "@mainsail/blockchain-utils";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { assert } from "@mainsail/utils";

@injectable()
export class ChainedVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.State.Store)
	private readonly store!: Contracts.State.Store;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const blockData = unit.getBlock().data;

		if (blockData.height === this.configuration.getGenesisHeight()) {
			const milestone = this.configuration.getMilestone();

			let validPreviousBlock = false;
			if (milestone.snapshot) {
				assert.defined(milestone.snapshot);
				validPreviousBlock = blockData.previousBlock === milestone.snapshot.previousGenesisBlockHash;
			} else {
				validPreviousBlock =
					blockData.previousBlock === "0000000000000000000000000000000000000000000000000000000000000000";
			}

			if (!validPreviousBlock) {
				throw new Exceptions.BlockNotChained(unit.getBlock());
			}
		} else if (!isBlockChained(this.store.getLastBlock().data, blockData)) {
			throw new Exceptions.BlockNotChained(unit.getBlock());
		}
	}
}

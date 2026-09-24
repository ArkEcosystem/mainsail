import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { BlockNotChained } from "@mainsail/exceptions";

const ZERO_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

@injectable()
export class ChainedVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.State.Store)
	private readonly store!: Contracts.State.Store;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const block = unit.getBlock();

		if (block.number === this.configuration.getGenesisHeight()) {
			this.#verifyGenesis(block);
			return;
		}

		const previousBlock = this.store.getLastBlock();

		if (block.parentHash !== previousBlock.hash) {
			throw new BlockNotChained(
				block,
				`parent hash ${block.parentHash} does not match previous block hash ${previousBlock.hash}`,
			);
		}

		if (block.number !== previousBlock.number + 1) {
			throw new BlockNotChained(
				block,
				`number ${block.number} does not follow previous block number ${previousBlock.number}`,
			);
		}
	}

	#verifyGenesis(block: Contracts.Crypto.Block): void {
		const { snapshot } = this.configuration.getMilestone(block.number);
		const expectedParentHash = snapshot ? snapshot.previousGenesisBlockHash : ZERO_HASH;

		if (block.parentHash !== expectedParentHash) {
			throw new BlockNotChained(
				block,
				`genesis parent hash ${block.parentHash} does not match expected ${expectedParentHash}`,
			);
		}
	}
}

import { isBlockChained } from "@mainsail/blockchain-utils";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class ChainedVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.State.Store)
	private readonly store!: Contracts.State.Store;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		// TODO: Check if someone can exploit this
		if (unit.getBlock().data.height === this.store.getGenesisHeight()) {
			return;
		}

		if (!isBlockChained(this.store.getLastBlock().data, unit.getBlock().data)) {
			throw new Exceptions.BlockNotChained(unit.getBlock());
		}
	}
}

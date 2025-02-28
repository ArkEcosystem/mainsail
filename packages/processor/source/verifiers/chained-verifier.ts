import { isBlockChained } from "@mainsail/blockchain-utils";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class ChainedVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		if (unit.getBlock().data.height === 0) {
			return;
		}

		if (!isBlockChained(this.stateStore.getLastBlock().data, unit.getBlock().data)) {
			throw new Exceptions.BlockNotChained(unit.getBlock());
		}
	}
}

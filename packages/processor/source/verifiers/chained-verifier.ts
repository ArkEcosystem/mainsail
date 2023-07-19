import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class ChainedVerifier implements Contracts.BlockProcessor.Handler {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	public async execute(unit: Contracts.BlockProcessor.IProcessableUnit): Promise<boolean> {
		return Utils.isBlockChained(this.stateStore.getLastBlock().data, unit.getBlock().data);
	}
}

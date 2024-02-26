import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class ChainedVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.State.Service)
	private readonly stateService!: Contracts.State.Service;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		if (unit.getBlock().data.height === 0) {
			return;
		}

		if (!Utils.isBlockChained(this.stateService.getStore().getLastBlock().data, unit.getBlock().data)) {
			throw new Exceptions.BlockNotChained(unit.getBlock());
		}
	}
}

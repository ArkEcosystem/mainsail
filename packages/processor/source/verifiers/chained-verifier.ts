import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class ChainedVerifier implements Contracts.BlockProcessor.Handler {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	public async execute(unit: Contracts.BlockProcessor.IProcessableUnit): Promise<boolean> {
		return Utils.isBlockChained(this.blockchain.getLastBlock().data, unit.getBlock().data);
	}
}

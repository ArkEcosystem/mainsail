import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class CommitHandler {
	@inject(Identifiers.State.Service)
	protected readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.BlockFactory;

	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

	public async handle(data: { block: string; }): Promise<void> {
		try {
			const store = this.stateService.createStoreClone();

			// TODO: Set height
			this.configuration.setHeight(1);

			const block = await this.blockFactory.fromHex(data.block);
			store.setLastBlock(block);
		} catch (error) {
			throw new Error(`Failed to commit block: ${error.message}`);
		}
	}
}

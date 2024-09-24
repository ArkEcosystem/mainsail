import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class CommitHandler {
	@inject(Identifiers.State.Store)
	protected readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.BlockFactory;

	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

	public async handle(data: { block: string }): Promise<void> {
		try {
			// TODO: Set height
			this.configuration.setHeight(1);

			const block = await this.blockFactory.fromHex(data.block);
			this.stateStore.setLastBlock(block);
		} catch (error) {
			throw new Error(`Failed to commit block: ${error.message}`);
		}
	}
}

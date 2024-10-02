import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class CommitHandler {
	@inject(Identifiers.State.Store)
	protected readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

	public async handle(height: number): Promise<void> {
		this.stateStore.setHeight(height);
		this.configuration.setHeight(height + 1);
	}
}

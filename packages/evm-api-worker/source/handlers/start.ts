import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class StartHandler {
	@inject(Identifiers.State.Store)
	private readonly store!: Contracts.State.Store;

	public async handle(height: number): Promise<void> {
		this.store.setHeight(height);
	}
}

import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Service implements Contracts.State.Service {
	@inject(Identifiers.State.Store.Factory)
	private readonly storeFactory!: Contracts.State.StoreFactory;

	#baseStore!: Contracts.State.Store;

	@postConstruct()
	public initialize(): void {
		this.#baseStore = this.storeFactory();
	}

	public getStore(): Contracts.State.Store {
		return this.#baseStore;
	}

	// Store clone is needed so processor can process transactions and make state changes independently of the base store
	// Many clone states can exists at the same time, if different blocks are proposed
	// The base store is only updated when a block is committed in onCommit method
	public createStoreClone(): Contracts.State.Store {
		return this.storeFactory(this.#baseStore);
	}

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
	}
}

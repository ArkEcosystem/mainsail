import { inject, injectable, postConstruct, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

@injectable()
export class Service implements Contracts.State.Service {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "state")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.State.Store.Factory)
	private readonly storeFactory!: Contracts.State.StoreFactory;

	@inject(Identifiers.State.WalletRepository.BySender.Factory)
	private readonly walletRepositoryBySenderFactory!: Contracts.State.WalletRepositoryBySenderFactory;

	@inject(Identifiers.State.Importer)
	private readonly importer!: Contracts.State.Importer;

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

	public async createWalletRepositoryBySender(publicKey: string): Promise<Contracts.State.WalletRepository> {
		return this.walletRepositoryBySenderFactory(this.#baseStore.walletRepository, publicKey);
	}

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		unit.store.commitChanges(unit);

		if (this.#baseStore.isBootstrap() || !this.configuration.getRequired("export.enabled")) {
			return;
		}

		if (unit.height % this.configuration.getRequired<number>("export.interval") === 0) {
			// Don't wait for export to finish
			void this.#baseStore.export();
		}
	}

	public async restore(maxHeight: number): Promise<void> {
		await this.importer.import(maxHeight, this.#baseStore);
	}
}

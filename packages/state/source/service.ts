import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { Exporter } from "./exporter";
import { Importer } from "./importer";

@injectable()
export class Service implements Contracts.State.Service {
	@inject(Identifiers.StateStoreFactory)
	private readonly stateStoreFactory!: Contracts.State.StateStoreFactory;

	@inject(Identifiers.WalletRepositoryFactory)
	private readonly walletRepositoryFactory!: Contracts.State.WalletRepositoryFactory;

	@inject(Identifiers.WalletRepositoryCloneFactory)
	private readonly walletRepositoryCloneFactory!: Contracts.State.WalletRepositoryCloneFactory;

	@inject(Identifiers.WalletRepositoryCopyOnWriteFactory)
	private readonly walletRepositoryCopyOnWriteFactory!: Contracts.State.WalletRepositoryCloneFactory;

	@inject(Identifiers.StateExporter)
	private readonly exporter!: Exporter;

	@inject(Identifiers.StateImporter)
	private readonly importer!: Importer;

	#baseStateStore!: Contracts.State.StateStore;
	#baseWalletRepository!: Contracts.State.WalletRepository;

	@postConstruct()
	public initialize(): void {
		this.#baseStateStore = this.stateStoreFactory();
		this.#baseWalletRepository = this.walletRepositoryFactory();
	}

	public getStateStore(): Contracts.State.StateStore {
		return this.#baseStateStore;
	}

	public getWalletRepository(): Contracts.State.WalletRepository {
		return this.#baseWalletRepository;
	}

	public createWalletRepositoryClone(): Contracts.State.WalletRepositoryClone {
		return this.walletRepositoryCloneFactory(this.getWalletRepository());
	}

	public createWalletRepositoryCopyOnWrite(): Contracts.State.WalletRepository {
		return this.walletRepositoryCopyOnWriteFactory(this.getWalletRepository());
	}

	public async onCommit(): Promise<void> {
		if (this.#baseStateStore.isBootstrap()) {
			return;
		}

		await this.exporter.export(this.#baseStateStore, this.#baseWalletRepository);
	}

	public async restore(maxHeight: number): Promise<void> {
		await this.importer.import(maxHeight, this.#baseStateStore, this.#baseWalletRepository);
	}
}

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

	@inject(Identifiers.State.WalletRepository.Base.Factory)
	private readonly walletRepositoryFactory!: Contracts.State.WalletRepositoryFactory;

	@inject(Identifiers.State.WalletRepository.Clone.Factory)
	private readonly walletRepositoryCloneFactory!: Contracts.State.WalletRepositoryCloneFactory;

	@inject(Identifiers.State.WalletRepository.BySender.Factory)
	private readonly walletRepositoryBySenderFactory!: Contracts.State.WalletRepositoryBySenderFactory;

	@inject(Identifiers.State.Exporter)
	private readonly exporter!: Contracts.State.Exporter;

	@inject(Identifiers.State.Importer)
	private readonly importer!: Contracts.State.Importer;

	#basestore!: Contracts.State.Store;
	#baseWalletRepository!: Contracts.State.WalletRepository;

	@postConstruct()
	public initialize(): void {
		this.#basestore = this.storeFactory();
		this.#baseWalletRepository = this.walletRepositoryFactory();
	}

	public getStore(): Contracts.State.Store {
		return this.#basestore;
	}

	public getWalletRepository(): Contracts.State.WalletRepository {
		return this.#baseWalletRepository;
	}

	public createWalletRepositoryClone(): Contracts.State.WalletRepositoryClone {
		return this.walletRepositoryCloneFactory(this.getWalletRepository());
	}

	public async createWalletRepositoryBySender(publicKey: string): Promise<Contracts.State.WalletRepository> {
		return this.walletRepositoryBySenderFactory(this.getWalletRepository(), publicKey);
	}

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		if (this.#basestore.isBootstrap() || !this.configuration.getRequired("export.enabled")) {
			return;
		}

		if (unit.height % this.configuration.getRequired<number>("export.interval") === 0) {
			await this.exporter.export(this.#basestore, this.#baseWalletRepository);
		}
	}

	public async restore(maxHeight: number): Promise<void> {
		await this.importer.import(maxHeight, this.#basestore, this.#baseWalletRepository);
	}
}

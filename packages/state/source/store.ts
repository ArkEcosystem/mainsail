import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Enums, Utils } from "@mainsail/kernel";

import { Repository } from "./repository";

@injectable()
export class Store implements Contracts.State.Store {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.State.AttributeRepository)
	private readonly attributeRepository!: Contracts.State.IAttributeRepository;

	@inject(Identifiers.State.WalletRepository.Base.Factory)
	private readonly walletRepositoryFactory!: Contracts.State.WalletRepositoryFactory;

	#genesisBlock?: Contracts.Crypto.Commit;
	#lastBlock?: Contracts.Crypto.Block;
	#isBootstrap = true;
	#originalStore?: Store;

	#repository!: Repository;
	#walletRepository!: Contracts.State.WalletRepository;

	configure(store?: Store): Store {
		if (store) {
			this.#originalStore = store;
			this.#genesisBlock = store.#genesisBlock;
			this.#lastBlock = store.#lastBlock;
			this.#isBootstrap = store.#isBootstrap;

			this.#repository = new Repository(this.attributeRepository, store.#repository);
			this.#walletRepository = this.walletRepositoryFactory(store.#walletRepository);
		} else {
			this.#repository = new Repository(this.attributeRepository, undefined, {
				height: 0,
				totalRound: 0,
			});
			this.#walletRepository = this.walletRepositoryFactory();
		}

		return this;
	}

	public get walletRepository(): Contracts.State.WalletRepository {
		return this.#walletRepository;
	}

	public isBootstrap(): boolean {
		return this.#isBootstrap;
	}

	public setBootstrap(value: boolean): void {
		this.#isBootstrap = value;
	}

	public getGenesisCommit(): Contracts.Crypto.Commit {
		Utils.assert.defined<Contracts.Crypto.Commit>(this.#genesisBlock);

		return this.#genesisBlock;
	}

	public setGenesisCommit(block: Contracts.Crypto.Commit): void {
		this.#genesisBlock = block;
	}

	public getLastBlock(): Contracts.Crypto.Block {
		Utils.assert.defined<Contracts.Crypto.Block>(this.#lastBlock);
		return this.#lastBlock;
	}

	public setLastBlock(block: Contracts.Crypto.Block): void {
		this.#lastBlock = block;
		this.setAttribute("height", block.data.height);

		// NOTE: The configuration is always set to the next height that will be proposed.
		this.configuration.setHeight(block.data.height + 1);
		if (this.configuration.isNewMilestone()) {
			this.logger.notice(`Milestone change: ${JSON.stringify(this.configuration.getMilestoneDiff())}`);

			void this.app
				.get<Contracts.Kernel.EventDispatcher>(Identifiers.Services.EventDispatcher.Service)
				.dispatch(Enums.CryptoEvent.MilestoneChanged);
		}
	}

	public getLastHeight(): number {
		return this.getAttribute("height");
	}

	public getTotalRound(): number {
		return this.getAttribute("totalRound");
	}

	public setTotalRound(totalRound: number): void {
		this.setAttribute("totalRound", totalRound);
	}

	public hasAttribute(key: string): boolean {
		return this.#repository.hasAttribute(key);
	}

	public setAttribute<T>(key: string, value: T): void {
		this.#repository.setAttribute(key, value);
	}

	public getAttribute<T>(key: string): T {
		return this.#repository.getAttribute(key);
	}

	public getWalletRepository(): Contracts.State.WalletRepository {
		return this.#walletRepository;
	}

	public commitChanges(): void {
		if (this.#originalStore) {
			this.#originalStore.#lastBlock = this.#lastBlock;
			this.#originalStore.#genesisBlock = this.#genesisBlock;
			this.#originalStore.#isBootstrap = this.#isBootstrap;

			this.#repository.commitChanges();
			this.#walletRepository.commitChanges();
		}
	}

	public toJson(): Contracts.Types.JsonObject {
		return this.#repository.toJson();
	}

	public fromJson(data: Contracts.Types.JsonObject): void {
		this.#repository.fromJson(data);
	}
}

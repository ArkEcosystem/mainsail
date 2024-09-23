import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class Store implements Contracts.State.Store {
	@inject(Identifiers.State.AttributeRepository)
	private readonly attributeRepository!: Contracts.State.AttributeRepository;


	@inject(Identifiers.State.StateRepository.Factory)
	protected readonly createStateRepository!: Contracts.State.StateRepositoryFactory;

	#genesisBlock?: Contracts.Crypto.Commit;
	#lastBlock?: Contracts.Crypto.Block;
	#originalStore?: Store;

	#repository!: Contracts.State.StateRepository;

	configure(store?: Store): Store {
		if (store) {
			this.#originalStore = store;
			this.#genesisBlock = store.#genesisBlock;
			this.#lastBlock = store.#lastBlock;

			this.#repository = this.createStateRepository(this.attributeRepository, store.#repository);
		} else {
			this.#repository = this.createStateRepository(this.attributeRepository, undefined, {
				height: 0,
				totalRound: 0,
			});
		}

		return this;
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
	}

	public getLastHeight(): number {
		return this.getAttribute("height");
	}

	public setTotalRoundAndHeight(totalRound: number, height: number): void {
		this.setAttribute("height", height);
		this.setAttribute("totalRound", totalRound);
	}

	public getTotalRound(): number {
		return this.getAttribute("totalRound");
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

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		this.setLastBlock(unit.getBlock());
		this.setAttribute("height", unit.height);
		this.setAttribute("totalRound", this.getTotalRound() + unit.round + 1);
	}

	public commitChanges(): void {
		if (this.#originalStore) {
			this.#originalStore.#lastBlock = this.#lastBlock;
			this.#originalStore.#genesisBlock = this.#genesisBlock;

			this.#repository.commitChanges();
		}
	}
}

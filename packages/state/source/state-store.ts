import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Enums, Utils } from "@mainsail/kernel";

import { factory } from "./attributes";

@injectable()
export class StateStore implements Contracts.State.StateStore {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.StateAttributes)
	private readonly attributeRepository!: Contracts.State.IAttributeRepository;

	#genesisBlock?: Contracts.Crypto.ICommittedBlock;
	#lastBlock?: Contracts.Crypto.IBlock;
	#isBootstrap = true;
	#originalStateStore?: Contracts.State.StateStore;

	protected readonly attributes = new Map<string, Contracts.State.IAttribute<unknown>>();

	@postConstruct()
	public initialize() {
		this.setAttribute("height", 0);
		this.setAttribute("totalRound", 0);
	}

	configure(stateStore?: Contracts.State.StateStore): Contracts.State.StateStore {
		this.#originalStateStore = stateStore;
		return this;
	}

	public isBootstrap(): boolean {
		return this.#isBootstrap;
	}

	public setBootstrap(value: boolean): void {
		this.#isBootstrap = value;
	}

	public getGenesisBlock(): Contracts.Crypto.ICommittedBlock {
		Utils.assert.defined<Contracts.Crypto.ICommittedBlock>(this.#genesisBlock);

		return this.#genesisBlock;
	}

	public setGenesisBlock(block: Contracts.Crypto.ICommittedBlock): void {
		this.#genesisBlock = block;
	}

	public getLastBlock(): Contracts.Crypto.IBlock {
		Utils.assert.defined<Contracts.Crypto.IBlock>(this.#lastBlock);
		return this.#lastBlock;
	}

	public setLastBlock(block: Contracts.Crypto.IBlock): void {
		this.#lastBlock = block;
		this.configuration.setHeight(block.data.height);
		this.setAttribute("height", block.data.height);

		if (this.configuration.isNewMilestone()) {
			this.logger.notice("Milestone change");

			void this.app
				.get<Contracts.Kernel.EventDispatcher>(Identifiers.EventDispatcherService)
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
		if (this.attributes.has(key)) {
			return true;
		}

		if (this.#originalStateStore) {
			return this.#originalStateStore.hasAttribute(key);
		}

		return false;
	}

	public setAttribute<T>(key: string, value: T): void {
		let attribute = this.attributes.get(key);

		if (!attribute) {
			attribute = factory(this.attributeRepository.getAttributeType(key), value);
			this.attributes.set(key, attribute);
		} else {
			attribute.set(value);
		}
	}

	public getAttribute<T>(key: string): T {
		if (this.attributes.has(key)) {
			return this.attributes.get(key)!.get() as T;
		}

		if (this.#originalStateStore) {
			return this.#originalStateStore.getAttribute<T>(key);
		}

		throw new Error(`Attribute "${key}" is not set.`);
	}
}

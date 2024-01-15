import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Enums, Utils } from "@mainsail/kernel";

import { factory, jsonFactory } from "./attributes";

@injectable()
export class StateStore implements Contracts.State.StateStore {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.State.AttributeRepository)
	private readonly attributeRepository!: Contracts.State.IAttributeRepository;

	#genesisBlock?: Contracts.Crypto.Commit;
	#lastBlock?: Contracts.Crypto.Block;
	#isBootstrap = true;
	#originalStateStore?: StateStore;

	protected readonly attributes = new Map<string, Contracts.State.IAttribute<unknown>>();

	configure(stateStore?: StateStore): StateStore {
		this.#originalStateStore = stateStore;

		if (stateStore) {
			this.#genesisBlock = stateStore.#genesisBlock;
			this.#lastBlock = stateStore.#lastBlock;
			this.#isBootstrap = stateStore.#isBootstrap;
		} else {
			this.setAttribute("height", 0);
			this.setAttribute("totalRound", 0);
		}

		return this;
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
		if (!this.hasAttribute(key)) {
			throw new Error(`Attribute "${key}" is not set.`);
		}

		return this.getAttributeHolder<T>(key).get();
	}

	public commitChanges(): void {
		if (this.#originalStateStore) {
			this.#originalStateStore.#lastBlock = this.#lastBlock;
			this.#originalStateStore.#genesisBlock = this.#genesisBlock;
			this.#originalStateStore.#isBootstrap = this.#isBootstrap;

			for (const [key, attribute] of this.attributes.entries()) {
				this.#originalStateStore.setAttribute(key, attribute.get());
			}
		}
	}

	public toJson(): Contracts.Types.JsonObject {
		const result = {};

		for (const name of this.attributeRepository.getAttributeNames()) {
			if (this.hasAttribute(name)) {
				result[name] = this.getAttributeHolder(name).toJson();
			}
		}

		return result;
	}

	public fromJson(data: Contracts.Types.JsonObject): void {
		this.attributes.clear();

		for (const [key, value] of Object.entries(data)) {
			Utils.assert.defined<Contracts.Types.JsonValue>(value);

			const attribute = jsonFactory(this.attributeRepository.getAttributeType(key), value);
			this.attributes.set(key, attribute);
		}
	}

	protected getAttributeHolder<T>(key: string): Contracts.State.IAttribute<T> {
		const attribute = this.attributes.get(key) as Contracts.State.IAttribute<T>;

		if (attribute) {
			return attribute;
		}

		Utils.assert.defined<StateStore>(this.#originalStateStore);
		return this.#originalStateStore?.getAttributeHolder<T>(key);
	}
}

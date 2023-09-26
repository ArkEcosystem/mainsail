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

	protected readonly attributes = new Map<string, Contracts.State.IAttribute<unknown>>();

	@postConstruct()
	public initialize() {
		this.setAttribute("height", 0);
		this.setAttribute("committedRound", 0);
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

	public getLastCommittedRound(): number {
		return this.getAttribute("committedRound");
	}

	public setLastCommittedRound(committedRound: number): void {
		this.setAttribute("committedRound", committedRound);
	}

	public hasAttribute(key: string): boolean {
		return this.attributes.has(key);
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
		if (this.hasAttribute(key)) {
			const attribute = this.attributes.get(key);

			if (attribute) {
				return attribute.get() as T;
			}
		}

		throw new Error(`Attribute "${key}" is not set.`);
	}
}

import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Enums, Utils } from "@mainsail/kernel";

// @TODO extract block and transaction behaviours into their respective stores
// @TODO review the implementation
@injectable()
export class StateStore implements Contracts.State.StateStore {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	#genesisBlock?: Contracts.Crypto.ICommittedBlock;
	#lastBlock?: Contracts.Crypto.IBlock;

	#isBootstrap = true;
	#committedRound = 0;

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

	public getLastHeight(): number {
		return this.getLastBlock().data.height;
	}

	public getLastBlock(): Contracts.Crypto.IBlock {
		Utils.assert.defined<Contracts.Crypto.IBlock>(this.#lastBlock);
		return this.#lastBlock;
	}

	public setLastBlock(block: Contracts.Crypto.IBlock): void {
		this.#lastBlock = block;
		this.configuration.setHeight(block.data.height);

		if (this.configuration.isNewMilestone()) {
			this.logger.notice("Milestone change");

			void this.app
				.get<Contracts.Kernel.EventDispatcher>(Identifiers.EventDispatcherService)
				.dispatch(Enums.CryptoEvent.MilestoneChanged);
		}
	}

	public getLastCommittedRound(): number {
		return this.#committedRound;
	}

	public setLastCommittedRound(committedRound: number): void {
		this.#committedRound = committedRound;
	}
}

import { inject,injectable } from "@mainsail/container";
import { Contracts, Events, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class Store implements Contracts.State.Store {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	#genesisBlock?: Contracts.Crypto.Commit;
	#lastBlock?: Contracts.Crypto.Block;
	#height = 0;
	#totalRound = 0;

	public setGenesisCommit(block: Contracts.Crypto.Commit): void {
		this.#genesisBlock = block;
	}

	public getGenesisCommit(): Contracts.Crypto.Commit {
		Utils.assert.defined<Contracts.Crypto.Commit>(this.#genesisBlock);

		return this.#genesisBlock;
	}

	public setLastBlock(block: Contracts.Crypto.Block): void {
		this.#lastBlock = block;
		this.setHeight(block.data.height);
	}

	public getLastBlock(): Contracts.Crypto.Block {
		Utils.assert.defined<Contracts.Crypto.Block>(this.#lastBlock);
		return this.#lastBlock;
	}

	// Set height is used on workers, because last block is not transferred
	public setHeight(height: number): void {
		this.#height = height;
		this.configuration.setHeight(height + 1);

		if (this.configuration.isNewMilestone()) {
			this.logger.notice(`Milestone change: ${JSON.stringify(this.configuration.getMilestoneDiff())}`);
			void this.events.dispatch(Events.CryptoEvent.MilestoneChanged);
		}
	}

	public getHeight(): number {
		return this.#height;
	}

	public setTotalRound(totalRound: number): void {
		this.#totalRound = totalRound;
	}

	public getTotalRound(): number {
		return this.#totalRound;
	}

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		this.setLastBlock(unit.getBlock());
		this.#totalRound += unit.round + 1;
	}
}

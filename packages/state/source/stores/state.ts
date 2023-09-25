import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Enums, Providers, Utils } from "@mainsail/kernel";
import assert from "assert";
import { OrderedMap, Seq } from "immutable";

// @TODO extract block and transaction behaviours into their respective stores
// @TODO review the implementation
@injectable()
export class StateStore implements Contracts.State.StateStore {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "state")
	private readonly pluginConfiguration!: Providers.PluginConfiguration;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	#genesisBlock?: Contracts.Crypto.ICommittedBlock;

	#isBootstrap = true;

	// The last committed round
	#committedRound = 0;

	// Stores the last n blocks in ascending height. The amount of last blocks
	// can be configured with the option `state.maxLastBlocks`.
	#lastBlocks: OrderedMap<number, Contracts.Crypto.IBlock> = OrderedMap<number, Contracts.Crypto.IBlock>();

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

	public getMaxLastBlocks(): number {
		return this.pluginConfiguration.getRequired<number>("storage.maxLastBlocks");
	}

	public getLastHeight(): number {
		return this.getLastBlock().data.height;
	}

	public getLastBlock(): Contracts.Crypto.IBlock {
		const lastBlock: Contracts.Crypto.IBlock | undefined = this.#lastBlocks.last();

		Utils.assert.defined<Contracts.Crypto.IBlock>(lastBlock);

		return lastBlock;
	}

	public setLastBlock(block: Contracts.Crypto.IBlock): void {
		// Only keep blocks which are below the new block height (i.e. rollback)
		if (
			this.#lastBlocks.last() &&
			this.#lastBlocks.last<Contracts.Crypto.IBlock>().data.height !== block.data.height - 1
		) {
			assert(block.data.height - 1 <= this.#lastBlocks.last<Contracts.Crypto.IBlock>().data.height);
			this.#lastBlocks = this.#lastBlocks.filter((b) => b.data.height < block.data.height);
		}

		this.#lastBlocks = this.#lastBlocks.set(block.data.height, block);

		this.configuration.setHeight(block.data.height);

		if (this.configuration.isNewMilestone()) {
			this.logger.notice("Milestone change");

			void this.app
				.get<Contracts.Kernel.EventDispatcher>(Identifiers.EventDispatcherService)
				.dispatch(Enums.CryptoEvent.MilestoneChanged);
		}

		// Delete oldest block if size exceeds the maximum
		if (this.#lastBlocks.size > this.getMaxLastBlocks()) {
			this.#lastBlocks = this.#lastBlocks.delete(this.#lastBlocks.first<Contracts.Crypto.IBlock>().data.height);
		}
	}

	public getLastBlocks(): Contracts.Crypto.IBlock[] {
		return this.#lastBlocks.valueSeq().reverse().toArray();
	}

	public getLastBlocksData(headersOnly?: boolean): Seq<number, Contracts.Crypto.IBlockData> {
		return this.#mapToBlockData(this.#lastBlocks.valueSeq().reverse(), headersOnly);
	}

	public getLastBlockIds(): string[] {
		return this.#lastBlocks
			.valueSeq()
			.reverse()
			.map((b) => b.data.id)
			.toArray();
	}

	public getLastBlocksByHeight(start: number, end?: number, headersOnly?: boolean): Contracts.Crypto.IBlockData[] {
		const tail: number | undefined = end || start;

		Utils.assert.defined<number>(tail);

		const blocks = this.#lastBlocks
			.valueSeq()
			.filter((block) => block.data.height >= start && block.data.height <= tail);

		return this.#mapToBlockData(blocks, headersOnly).toArray() as Contracts.Crypto.IBlockData[];
	}

	public getLastCommittedRound(): number {
		return this.#committedRound;
	}

	public setLastCommittedRound(committedRound: number): void {
		this.#committedRound = committedRound;
	}

	// Map Block instances to block data.
	#mapToBlockData(
		blocks: Seq<number, Contracts.Crypto.IBlock>,
		headersOnly?: boolean,
	): Seq<number, Contracts.Crypto.IBlockData> {
		// TODO: Add type support for headers only
		// @ts-ignore
		return blocks.map((block) => ({
			...block.data,
			transactions: headersOnly ? undefined : block.transactions.map((tx) => tx.data),
		}));
	}
}

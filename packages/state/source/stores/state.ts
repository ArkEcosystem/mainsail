import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Enums, Providers, Utils } from "@mainsail/kernel";
import assert from "assert";
import { OrderedMap, OrderedSet, Seq } from "immutable";

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

	#blockchain: any = {};
	#genesisBlock?: Contracts.Crypto.ICommittedBlock;
	#lastDownloadedBlock?: Contracts.Crypto.IBlockData;
	#lastStoredBlockHeight = 1;
	#started = false;
	#wakeUpTimeout?: NodeJS.Timeout;
	#noBlockCounter = 0;
	#p2pUpdateCounter = 0;
	#networkStart = false;
	#restoredDatabaseIntegrity = false;

	// The last committed round
	#committedRound = 0;

	// Stores the last n blocks in ascending height. The amount of last blocks
	// can be configured with the option `state.maxLastBlocks`.
	#lastBlocks: OrderedMap<number, Contracts.Crypto.IBlock> = OrderedMap<number, Contracts.Crypto.IBlock>();
	// Stores the last n incoming transaction ids. The amount of transaction ids
	// can be configured with the option `state.maxLastTransactionIds`.
	#cachedTransactionIds: OrderedSet<string> = OrderedSet();

	public getBlockchain(): any {
		return this.#blockchain;
	}

	public setBlockchain(blockchain: any): void {
		this.#blockchain = blockchain;
	}

	public getGenesisBlock(): Contracts.Crypto.ICommittedBlock {
		Utils.assert.defined<Contracts.Crypto.ICommittedBlock>(this.#genesisBlock);

		return this.#genesisBlock;
	}

	public setGenesisBlock(block: Contracts.Crypto.ICommittedBlock): void {
		this.#genesisBlock = block;
	}

	public getLastDownloadedBlock(): Contracts.Crypto.IBlockData | undefined {
		return this.#lastDownloadedBlock;
	}

	public setLastDownloadedBlock(block: Contracts.Crypto.IBlockData): void {
		this.#lastDownloadedBlock = block;
	}

	public getLastStoredBlockHeight(): number {
		return this.#lastStoredBlockHeight;
	}

	public setLastStoredBlockHeight(height: number): void {
		this.#lastStoredBlockHeight = height;
	}

	public isStarted(): boolean {
		return this.#started;
	}

	public setStarted(started: boolean): void {
		this.#started = started;
	}

	public getNoBlockCounter(): number {
		return this.#noBlockCounter;
	}

	public setNoBlockCounter(noBlockCounter: number): void {
		this.#noBlockCounter = noBlockCounter;
	}

	public getP2pUpdateCounter(): number {
		return this.#p2pUpdateCounter;
	}

	public setP2pUpdateCounter(p2pUpdateCounter: number): void {
		this.#p2pUpdateCounter = p2pUpdateCounter;
	}

	public getNetworkStart(): boolean {
		return this.#networkStart;
	}

	public setNetworkStart(networkStart: boolean): void {
		this.#networkStart = networkStart;
	}

	public getRestoredDatabaseIntegrity(): boolean {
		return this.#restoredDatabaseIntegrity;
	}

	public setRestoredDatabaseIntegrity(restoredDatabaseIntegrity: boolean): void {
		this.#restoredDatabaseIntegrity = restoredDatabaseIntegrity;
	}

	public reset(blockchainMachine): void {
		this.#blockchain = blockchainMachine.initialState;
	}

	public isWakeUpTimeoutSet(): boolean {
		return !!this.#wakeUpTimeout;
	}

	public setWakeUpTimeout(callback: Function, timeout: number): void {
		this.#wakeUpTimeout = setTimeout(() => {
			this.clearWakeUpTimeout();
			callback();
		}, timeout);
	}

	public clearWakeUpTimeout(): void {
		if (this.#wakeUpTimeout) {
			clearTimeout(this.#wakeUpTimeout);
			this.#wakeUpTimeout = undefined;
		}
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

		this.#noBlockCounter = 0;
		this.#p2pUpdateCounter = 0;
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

	public getCommonBlocks(ids: string[]): Contracts.Crypto.IBlockData[] {
		const idsHash = {};

		for (const id of ids) {
			idsHash[id] = true;
		}

		return this.getLastBlocksData(true)
			.filter((block) => idsHash[block.id])
			.toArray() as Contracts.Crypto.IBlockData[];
	}

	public getLastCommittedRound(): number {
		return this.#committedRound;
	}

	public setLastCommittedRound(committedRound: number): void {
		this.#committedRound = committedRound;
	}

	public cacheTransactions(transactions: Contracts.Crypto.ITransactionData[]): {
		added: Contracts.Crypto.ITransactionData[];
		notAdded: Contracts.Crypto.ITransactionData[];
	} {
		const notAdded: Contracts.Crypto.ITransactionData[] = [];
		const added: Contracts.Crypto.ITransactionData[] = transactions.filter((tx) => {
			Utils.assert.defined<string>(tx.id);

			if (this.#cachedTransactionIds.has(tx.id)) {
				notAdded.push(tx);

				return false;
			}

			return true;
		});

		this.#cachedTransactionIds = this.#cachedTransactionIds.withMutations((cache) => {
			for (const tx of added) {
				Utils.assert.defined<string>(tx.id);

				cache.add(tx.id);
			}
		});

		// Cap the Set of last transaction ids to maxLastTransactionIds
		const maxLastTransactionIds = this.pluginConfiguration.getRequired<number>("storage.maxLastTransactionIds");

		if (this.#cachedTransactionIds.size > maxLastTransactionIds) {
			this.#cachedTransactionIds = this.#cachedTransactionIds.takeLast(maxLastTransactionIds);
		}

		return { added, notAdded };
	}

	public clearCachedTransactionIds(): void {
		this.#cachedTransactionIds = this.#cachedTransactionIds.clear();
	}

	public getCachedTransactionIds(): string[] {
		return this.#cachedTransactionIds.toArray();
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

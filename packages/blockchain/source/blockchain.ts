import { inject, injectable, postConstruct, tagged } from "@mainsail/container";
import { Constants, Contracts, Identifiers } from "@mainsail/contracts";
import { Enums, Providers, Types, Utils } from "@mainsail/kernel";

import { ProcessBlocksJob } from "./process-blocks-job";
import { StateMachine } from "./state-machine";
import { blockchainMachine } from "./state-machine/machine";

// @TODO reduce the overall complexity of this class and remove all helpers and getters that just serve as proxies
@injectable()
export class Blockchain implements Contracts.Blockchain.Blockchain {
	@inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "blockchain")
	private readonly pluginConfiguration!: Providers.PluginConfiguration;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	@inject(Identifiers.StateMachine)
	private readonly stateMachine!: StateMachine;

	@inject(Identifiers.PeerNetworkMonitor)
	private readonly networkMonitor!: Contracts.P2P.NetworkMonitor;

	@inject(Identifiers.PeerRepository)
	private readonly peerRepository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	#queue!: Contracts.Kernel.Queue;

	#stopped!: boolean;
	#booted = false;
	#missedBlocks = 0;
	#lastCheckNetworkHealthTs = 0;

	@postConstruct()
	public async initialize(): Promise<void> {
		this.#stopped = false;

		// flag to force a network start
		this.stateStore.setNetworkStart(this.pluginConfiguration.getOptional("options.networkStart", false));

		if (this.stateStore.getNetworkStart()) {
			this.logger.warning(
				"Mainsail is launched in Genesis Start mode. This is usually for starting the first node on the blockchain. Unless you know what you are doing, this is likely wrong.",
			);
		}

		this.#queue = await this.app.get<Types.QueueFactory>(Identifiers.QueueFactory)();

		this.#queue.on("drain", () => {
			this.dispatch("PROCESSFINISHED");
		});

		this.#queue.on("jobError", (job, error) => {
			const blocks = (job as ProcessBlocksJob).getBlocks();

			this.logger.error(
				`Failed to process ${Utils.pluralize(
					"block",
					blocks.length,
					true,
				)} from height ${blocks[0].height.toLocaleString()} in queue.`,
			);
		});
	}

	public isStopped(): boolean {
		return this.#stopped;
	}

	public isBooted(): boolean {
		return this.#booted;
	}

	public getQueue(): Contracts.Kernel.Queue {
		return this.#queue;
	}

	public dispatch(event: string): void {
		return this.stateMachine.transition(event);
	}

	public async boot(skipStartedCheck = false): Promise<boolean> {
		this.logger.info("Starting Blockchain Manager");

		this.stateStore.reset(blockchainMachine);

		this.dispatch("START");

		if (skipStartedCheck || process.env[Constants.Flags.CORE_SKIP_BLOCKCHAIN_STARTED_CHECK]) {
			return true;
		}

		while (!this.stateStore.isStarted() && !this.#stopped) {
			await Utils.sleep(1000);
		}

		await this.networkMonitor.cleansePeers({
			forcePing: true,
			peerCount: 10,
		});

		this.events.listen(Enums.ForgerEvent.Missing, { handle: () => this.checkMissingBlocks() });

		this.events.listen(Enums.RoundEvent.Applied, { handle: () => this.#resetMissedBlocks() });

		this.#booted = true;

		return true;
	}

	public async dispose(): Promise<void> {
		if (!this.#stopped) {
			this.logger.info("Stopping Blockchain Manager");

			this.#stopped = true;
			this.stateStore.clearWakeUpTimeout();

			this.dispatch("STOP");

			await this.#queue.stop();
		}
	}

	public setWakeUp(): void {
		this.stateStore.setWakeUpTimeout(() => {
			this.dispatch("WAKEUP");
		}, 60_000);
	}

	public resetWakeUp(): void {
		this.stateStore.clearWakeUpTimeout();
		this.setWakeUp();
	}

	public clearAndStopQueue(): void {
		this.stateStore.setLastDownloadedBlock(this.getLastBlock().data);

		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		this.#queue.pause();
		this.clearQueue();
	}

	public clearQueue(): void {
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		this.#queue.clear();
	}

	public async handleIncomingBlock(block: Contracts.Crypto.IBlockData, fromForger = false): Promise<void> {
		this.pushPingBlock(block, fromForger);

		if (this.stateStore.isStarted()) {
			this.dispatch("NEWBLOCK");
			this.enqueueBlocks([block]);

			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			this.events.dispatch(Enums.BlockEvent.Received, block);
		} else {
			this.logger.info(`Block disregarded because blockchain is not ready`);

			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			this.events.dispatch(Enums.BlockEvent.Disregarded, block);
		}
	}

	public enqueueBlocks(blocks: Contracts.Crypto.IBlockData[]): void {
		if (blocks.length === 0) {
			return;
		}

		const __createQueueJob = (blocks: Contracts.Crypto.IBlockData[]) => {
			const processBlocksJob = this.app.resolve<ProcessBlocksJob>(ProcessBlocksJob);
			processBlocksJob.setBlocks(blocks);

			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			this.#queue.push(processBlocksJob);
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			this.#queue.resume();
		};

		const lastDownloadedHeight: number = this.getLastDownloadedBlock().height;
		const milestoneHeights: number[] = this.configuration
			.getMilestones()
			.map((milestone) => milestone.height)
			.sort((a, b) => a - b)
			.filter((height) => height >= lastDownloadedHeight);

		// divide blocks received into chunks depending on number of transactions
		// this is to avoid blocking the application when processing "heavy" blocks
		let currentBlocksChunk: any[] = [];
		let currentTransactionsCount = 0;
		for (const block of blocks) {
			Utils.assert.defined<Contracts.Crypto.IBlockData>(block);

			currentBlocksChunk.push(block);
			currentTransactionsCount += block.numberOfTransactions;

			const nextMilestone = milestoneHeights[0] && milestoneHeights[0] === block.height;

			if (
				currentTransactionsCount >= 150 ||
				currentBlocksChunk.length >= Math.min(this.stateStore.getMaxLastBlocks(), 100) ||
				nextMilestone
			) {
				__createQueueJob(currentBlocksChunk);
				currentBlocksChunk = [];
				currentTransactionsCount = 0;
				if (nextMilestone) {
					milestoneHeights.shift();
				}
			}
		}
		__createQueueJob(currentBlocksChunk);
	}

	public resetLastDownloadedBlock(): void {
		this.stateStore.setLastDownloadedBlock(this.getLastBlock().data);
	}

	public forceWakeup(): void {
		this.stateStore.clearWakeUpTimeout();

		this.dispatch("WAKEUP");
	}

	public isSynced(block?: Contracts.Crypto.IBlockData): boolean {
		if (!this.peerRepository.hasPeers()) {
			return true;
		}

		block = block || this.getLastBlock().data;

		return true;

		// TODO: Fix
		// return this.slots.getTime() - block.timestamp < 3 * this.configuration.getMilestone(block.height).blockTime;
	}

	public getLastBlock(): Contracts.Crypto.IBlock {
		return this.stateStore.getLastBlock();
	}

	public getLastHeight(): number {
		return this.getLastBlock().data.height;
	}

	public getLastDownloadedBlock(): Contracts.Crypto.IBlockData {
		return this.stateStore.getLastDownloadedBlock() || this.getLastBlock().data;
	}

	public getBlockPing(): Contracts.State.BlockPing | undefined {
		return this.stateStore.getBlockPing();
	}

	public pingBlock(incomingBlock: Contracts.Crypto.IBlockData): boolean {
		return this.stateStore.pingBlock(incomingBlock);
	}

	public pushPingBlock(block: Contracts.Crypto.IBlockData, fromForger = false): void {
		this.stateStore.pushPingBlock(block, fromForger);
	}

	public async checkMissingBlocks(): Promise<void> {
		this.#missedBlocks++;
		if (this.#missedBlocks >= this.configuration.getMilestone().activeValidators / 3 - 1 && Math.random() <= 0.8) {
			this.#resetMissedBlocks();

			// do not check network health here more than every 10 minutes
			const nowTs = Date.now();
			if (nowTs - this.#lastCheckNetworkHealthTs < 10 * 60 * 1000) {
				return;
			}
			this.#lastCheckNetworkHealthTs = nowTs;
		}
	}

	#resetMissedBlocks(): void {
		this.#missedBlocks = 0;
	}
}

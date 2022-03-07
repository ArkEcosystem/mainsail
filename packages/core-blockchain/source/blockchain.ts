import { inject, injectable, postConstruct, tagged } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Enums, Providers, Types, Utils } from "@arkecosystem/core-kernel";

import { ProcessBlocksJob } from "./process-blocks-job";
import { StateMachine } from "./state-machine";
import { blockchainMachine } from "./state-machine/machine";

// todo: reduce the overall complexity of this class and remove all helpers and getters that just serve as proxies
@injectable()
export class Blockchain implements Contracts.Blockchain.Blockchain {
	@inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "core-blockchain")
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
	private readonly configuration: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Time.Slots)
	private readonly slots: any;

	private queue!: Contracts.Kernel.Queue;

	private stopped!: boolean;
	private booted = false;
	private missedBlocks = 0;
	private lastCheckNetworkHealthTs = 0;

	@postConstruct()
	public async initialize(): Promise<void> {
		this.stopped = false;

		// flag to force a network start
		this.stateStore.setNetworkStart(this.pluginConfiguration.getOptional("options.networkStart", false));

		if (this.stateStore.getNetworkStart()) {
			this.logger.warning(
				"ARK Core is launched in Genesis Start mode. This is usually for starting the first node on the blockchain. Unless you know what you are doing, this is likely wrong.",
			);
		}

		this.queue = await this.app.get<Types.QueueFactory>(Identifiers.QueueFactory)();

		this.queue.on("drain", () => {
			this.dispatch("PROCESSFINISHED");
		});

		this.queue.on("jobError", (job, error) => {
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
		return this.stopped;
	}

	public isBooted(): boolean {
		return this.booted;
	}

	public getQueue(): Contracts.Kernel.Queue {
		return this.queue;
	}

	public dispatch(event: string): void {
		return this.stateMachine.transition(event);
	}

	public async boot(skipStartedCheck = false): Promise<boolean> {
		this.logger.info("Starting Blockchain Manager");

		this.stateStore.reset(blockchainMachine);

		this.dispatch("START");

		if (skipStartedCheck || process.env.CORE_SKIP_BLOCKCHAIN_STARTED_CHECK) {
			return true;
		}

		while (!this.stateStore.isStarted() && !this.stopped) {
			await Utils.sleep(1000);
		}

		await this.networkMonitor.cleansePeers({
			forcePing: true,
			peerCount: 10,
		});

		this.events.listen(Enums.ForgerEvent.Missing, { handle: this.checkMissingBlocks });

		this.events.listen(Enums.RoundEvent.Applied, { handle: this.resetMissedBlocks });

		this.booted = true;

		return true;
	}

	public async dispose(): Promise<void> {
		if (!this.stopped) {
			this.logger.info("Stopping Blockchain Manager");

			this.stopped = true;
			this.stateStore.clearWakeUpTimeout();

			this.dispatch("STOP");

			await this.queue.stop();
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

		this.queue.pause();
		this.clearQueue();
	}

	public clearQueue(): void {
		this.queue.clear();
	}

	public async handleIncomingBlock(block: Contracts.Crypto.IBlockData, fromForger = false): Promise<void> {
		const blockTimeLookup = await Utils.forgingInfoCalculator.getBlockTimeLookup(
			this.app,
			block.height,
			this.configuration,
		);

		const currentSlot: number = this.slots.getSlotNumber(blockTimeLookup);
		const receivedSlot: number = this.slots.getSlotNumber(blockTimeLookup, block.timestamp);

		if (fromForger) {
			const minimumMs = 2000;
			const timeLeftInMs: number = this.slots.getTimeInMsUntilNextSlot(blockTimeLookup);
			if (currentSlot !== receivedSlot || timeLeftInMs < minimumMs) {
				this.logger.info(`Discarded block ${block.height.toLocaleString()} because it was received too late.`);
				return;
			}
		}

		if (receivedSlot > currentSlot) {
			this.logger.info(`Discarded block ${block.height.toLocaleString()} because it takes a future slot.`);
			return;
		}

		this.pushPingBlock(block, fromForger);

		if (this.stateStore.isStarted()) {
			this.dispatch("NEWBLOCK");
			this.enqueueBlocks([block]);

			this.events.dispatch(Enums.BlockEvent.Received, block);
		} else {
			this.logger.info(`Block disregarded because blockchain is not ready`);

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

			this.queue.push(processBlocksJob);
			this.queue.resume();
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

	public forkBlock(block: Contracts.Crypto.IBlock, numberOfBlockToRollback?: number): void {
		this.stateStore.setForkedBlock(block);

		this.clearAndStopQueue();

		if (numberOfBlockToRollback) {
			this.stateStore.setNumberOfBlocksToRollback(numberOfBlockToRollback);
		}

		this.dispatch("FORK");
	}

	public isSynced(block?: Contracts.Crypto.IBlockData): boolean {
		if (!this.peerRepository.hasPeers()) {
			return true;
		}

		block = block || this.getLastBlock().data;

		return this.slots.getTime() - block.timestamp < 3 * this.configuration.getMilestone(block.height).blocktime;
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
		this.missedBlocks++;
		if (this.missedBlocks >= this.configuration.getMilestone().activeValidators / 3 - 1 && Math.random() <= 0.8) {
			this.resetMissedBlocks();

			// do not check network health here more than every 10 minutes
			const nowTs = Date.now();
			if (nowTs - this.lastCheckNetworkHealthTs < 10 * 60 * 1000) {
				return;
			}
			this.lastCheckNetworkHealthTs = nowTs;

			const networkStatus = await this.networkMonitor.checkNetworkHealth();

			if (networkStatus.forked) {
				this.stateStore.setNumberOfBlocksToRollback(networkStatus.blocksToRollback || 0);
				this.dispatch("FORK");
			}
		}
	}

	private resetMissedBlocks(): void {
		this.missedBlocks = 0;
	}
}

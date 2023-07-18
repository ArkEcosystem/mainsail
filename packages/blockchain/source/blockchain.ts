import { inject, injectable, postConstruct } from "@mainsail/container";
import { Constants, Contracts, Identifiers } from "@mainsail/contracts";
import { Enums, Utils } from "@mainsail/kernel";

import { StateMachine } from "./state-machine";
import { blockchainMachine } from "./state-machine/machine";

// @TODO reduce the overall complexity of this class and remove all helpers and getters that just serve as proxies
@injectable()
export class Blockchain implements Contracts.Blockchain.Blockchain {
	@inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

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

	#stopped!: boolean;
	#booted = false;
	#missedBlocks = 0;
	#lastCheckNetworkHealthTs = 0;

	@postConstruct()
	public async initialize(): Promise<void> {
		this.#stopped = false;
	}

	public isStopped(): boolean {
		return this.#stopped;
	}

	public isBooted(): boolean {
		return this.#booted;
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

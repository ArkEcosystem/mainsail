import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { Container, Enums, Providers, Utils } from "@arkecosystem/core-kernel";

import { WalletEvent } from "./wallet-event";

@Container.injectable()
export class WalletSyncService implements Contracts.Kernel.EventListener {
	@Container.inject(Identifiers.PluginConfiguration)
	@Container.tagged("plugin", "core-state")
	private readonly configuration!: Providers.PluginConfiguration;

	@Container.inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@Container.inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@Container.inject(Identifiers.WalletRepository)
	@Container.tagged("state", "blockchain")
	private readonly walletRepository!: Contracts.State.WalletRepository;

	@Container.inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	@Container.inject(Identifiers.DatabaseWalletsTableService)
	private readonly walletsTableService!: Contracts.Database.WalletsTableService;

	@Container.inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	private readonly lock = new Utils.Lock();

	private readonly updatedAddresses = new Set<string>();

	private disposed = false;

	public boot(): void {
		if (this.configuration.getRequired("walletSync.enabled")) {
			this.events.listen(Enums.StateEvent.BuilderFinished, this);
			this.events.listen(WalletEvent.AttributeSet, this);
			this.events.listen(WalletEvent.AttributeForget, this);
			this.events.listen(WalletEvent.PropertySet, this);
			this.events.listen(Enums.BlockEvent.Applied, this);
			this.events.listen(Enums.BlockEvent.Reverted, this);
		}
	}

	public dispose(): void {
		if (this.configuration.getRequired("walletSync.enabled")) {
			this.events.forget(Enums.StateEvent.BuilderFinished, this);
			this.events.forget(WalletEvent.AttributeSet, this);
			this.events.forget(WalletEvent.AttributeForget, this);
			this.events.forget(WalletEvent.PropertySet, this);
			this.events.forget(Enums.BlockEvent.Applied, this);
			this.events.forget(Enums.BlockEvent.Reverted, this);
		}

		this.disposed = true;
	}

	public handle({ name, data }): void {
		switch (name) {
			case Enums.StateEvent.BuilderFinished:
				void this.initializeWalletsTable(this.stateStore.getLastHeight()); // @TODO
				break;
			case WalletEvent.AttributeSet:
			case WalletEvent.AttributeForget:
			case WalletEvent.PropertySet:
				this.updatedAddresses.add(data.wallet.address);
				break;
			case Enums.BlockEvent.Applied:
				void this.syncWalletsTable(data.height); // @TODO
				break;
			case Enums.BlockEvent.Reverted:
				void this.syncWalletsTable(data.height - 1); // @TODO
				break;
		}
	}

	private async initializeWalletsTable(blockHeight: number): Promise<void> {
		await this.lock.runExclusive(async () => {
			if (this.disposed) {
				return;
			}

			try {
				this.logger.debug(`Initializing wallets table at height ${blockHeight.toLocaleString()}`);

				await this.walletsTableService.flush();
				await this.walletsTableService.sync(this.walletRepository.allByAddress());

				this.logger.info(`Wallets table initialized at height ${blockHeight.toLocaleString()}`);
			} catch (error) {
				await this.app.terminate("Failed to initialize wallets table", error);
			}
		});
	}

	private async syncWalletsTable(blockHeight: number): Promise<void> {
		await this.lock.runExclusive(async () => {
			if (this.disposed) {
				return;
			}

			try {
				this.logger.debug(`Synchronizing wallets table at height ${blockHeight.toLocaleString()}`);

				const updatedWallets = [...this.updatedAddresses.values()].map((address) =>
					this.walletRepository.findByAddress(address),
				);

				this.updatedAddresses.clear();

				await this.walletsTableService.sync(updatedWallets);

				this.logger.info(`Wallets table synchronized at height ${blockHeight.toLocaleString()}`);
			} catch (error) {
				await this.app.terminate("Failed to synchronize wallets table", error);
			}
		});
	}
}

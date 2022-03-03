import { interfaces, Selectors } from "@arkecosystem/core-container";
import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { Providers, Services } from "@arkecosystem/core-kernel";
import Joi from "joi";

import { BuildDelegateRankingAction, GetActiveDelegatesAction } from "./actions";
import { BlockState } from "./block-state";
import { DatabaseInteraction } from "./database-interactions";
import { DatabaseInterceptor } from "./database-interceptor";
import { DposPreviousRoundState, DposState } from "./dpos";
import { RoundState } from "./round-state";
import { StateBuilder } from "./state-builder";
import { BlockStore } from "./stores/blocks";
import { StateStore } from "./stores/state";
import { TransactionStore } from "./stores/transactions";
import { TransactionValidator } from "./transaction-validator";
import { WalletRepository, WalletRepositoryClone, WalletRepositoryCopyOnWrite } from "./wallets";
import { registerIndexers } from "./wallets/indexers";
import { walletFactory } from "./wallets/wallet-factory";
import { WalletSyncService } from "./wallets/wallet-sync-service";

export const dposPreviousRoundStateProvider =
	(context: interfaces.Context) =>
	async (
		blocks: Crypto.IBlock[],
		roundInfo: Contracts.Shared.RoundInfo,
	): Promise<Contracts.State.DposPreviousRoundState> => {
		const previousRound = context.container.resolve(DposPreviousRoundState);
		await previousRound.revert(blocks, roundInfo);
		return previousRound;
	};

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		registerIndexers(this.app);

		this.app
			.bind(Identifiers.WalletRepository)
			.to(WalletRepository)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "blockchain"));

		this.app
			.bind(Identifiers.WalletFactory)
			.toFactory(({ container }) =>
				walletFactory(
					container.get(Identifiers.WalletAttributes),
					container.get(Identifiers.EventDispatcherService),
				),
			)
			.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "blockchain"));

		this.app
			.bind(Identifiers.WalletRepository)
			.to(WalletRepositoryClone)
			.inRequestScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "clone"));

		this.app
			.bind(Identifiers.WalletFactory)
			.toFactory(({ container }) => walletFactory(container.get(Identifiers.WalletAttributes)))
			.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "clone"));

		this.app
			.bind(Identifiers.WalletRepository)
			.to(WalletRepositoryCopyOnWrite)
			.inRequestScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "copy-on-write"));

		this.app
			.bind(Identifiers.WalletFactory)
			.toFactory(({ container }) => walletFactory(container.get(Identifiers.WalletAttributes)))
			.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "copy-on-write"));

		this.app.bind(Identifiers.DposState).to(DposState);
		this.app.bind(Identifiers.BlockState).to(BlockState);
		this.app.bind(Identifiers.RoundState).to(RoundState).inSingletonScope();

		this.app.bind(Identifiers.StateBlockStore).toConstantValue(new BlockStore(1000));
		this.app.bind(Identifiers.StateTransactionStore).toConstantValue(new TransactionStore(1000));

		this.app.bind(Identifiers.StateStore).to(StateStore).inSingletonScope();

		this.app
			.bind<Contracts.State.DposPreviousRoundStateProvider>(Identifiers.DposPreviousRoundStateProvider)
			.toProvider(dposPreviousRoundStateProvider);

		this.app.bind(Identifiers.TransactionValidator).to(TransactionValidator);

		this.app.bind(Identifiers.TransactionValidatorFactory).toAutoFactory(Identifiers.TransactionValidator);

		this.app.bind(Identifiers.DatabaseInteraction).to(DatabaseInteraction).inSingletonScope();
		this.app.bind(Identifiers.DatabaseInterceptor).to(DatabaseInterceptor).inSingletonScope();
		this.app.bind(Identifiers.StateWalletSyncService).to(WalletSyncService).inSingletonScope();

		this.app.bind(Identifiers.StateBuilder).to(StateBuilder);

		this.registerActions();
	}

	public async boot(): Promise<void> {
		this.app.get<WalletSyncService>(Identifiers.StateWalletSyncService).boot();
		await this.app.get<DatabaseInteraction>(Identifiers.DatabaseInteraction).initialize();
	}

	public async dispose(): Promise<void> {
		this.app.get<WalletSyncService>(Identifiers.StateWalletSyncService).dispose();
	}

	public async bootWhen(serviceProvider?: string): Promise<boolean> {
		return serviceProvider === "@arkecosystem/core-database";
	}

	public configSchema(): object {
		return Joi.object({
			storage: Joi.object({
				maxLastBlocks: Joi.number().integer().min(1).required(),
				maxLastTransactionIds: Joi.number().integer().min(1).required(),
			}).required(),
			walletSync: Joi.object({
				enabled: Joi.boolean().required(),
			}).required(),
		}).unknown(true);
	}

	private registerActions(): void {
		this.app
			.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
			.bind("buildDelegateRanking", new BuildDelegateRankingAction());

		this.app
			.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
			.bind("getActiveDelegates", new GetActiveDelegatesAction(this.app));
	}
}

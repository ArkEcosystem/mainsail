import { Selectors } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { Providers, Services } from "@mainsail/kernel";
import Joi from "joi";

import { BuildValidatorRankingAction, GetActiveValidatorsAction } from "./actions";
import { BlockState } from "./block-state";
import { DatabaseInteraction } from "./database-interactions";
import { DposState } from "./dpos";
import { AttributeMutator } from "./mutators/attribute";
import { BalanceMutator } from "./mutators/balance";
import { RoundState } from "./round-state";
import { StateBuilder } from "./state-builder";
import { StateStore } from "./stores/state";
import { TransactionValidator } from "./transaction-validator";
import { WalletRepository, WalletRepositoryClone, WalletRepositoryCopyOnWrite } from "./wallets";
import { registerIndexers } from "./wallets/indexers";
import { walletFactory } from "./wallets/wallet-factory";

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

		this.app.bind(Identifiers.StateStore).to(StateStore).inSingletonScope();

		this.app.bind(Identifiers.TransactionValidator).to(TransactionValidator);

		this.app.bind(Identifiers.TransactionValidatorFactory).toAutoFactory(Identifiers.TransactionValidator);

		this.app.bind(Identifiers.DatabaseInteraction).to(DatabaseInteraction).inSingletonScope();

		this.app.bind(Identifiers.StateBuilder).to(StateBuilder);

		this.#registerActions();

		this.app.bind(Identifiers.State.ValidatorMutator).to(AttributeMutator);
		this.app.bind(Identifiers.State.ValidatorMutator).to(BalanceMutator);
	}

	public async boot(): Promise<void> {
		await this.app.get<DatabaseInteraction>(Identifiers.DatabaseInteraction).initialize();
	}

	public async bootWhen(serviceProvider?: string): Promise<boolean> {
		return serviceProvider === "@mainsail/database";
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

	#registerActions(): void {
		this.app
			.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
			.bind("buildValidatorRanking", new BuildValidatorRankingAction());

		this.app
			.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
			.bind("getActiveValidators", new GetActiveValidatorsAction(this.app));
	}
}

import { Selectors } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import Joi from "joi";

import { BlockState } from "./block-state";
import { AttributeMutator } from "./mutators/attribute";
import { BalanceMutator } from "./mutators/balance";
import { StateVerifier } from "./state-verifier";
import { StateStore } from "./stores/state";
import { TransactionValidator } from "./transaction-validator";
import { WalletRepository, WalletRepositoryClone, WalletRepositoryCopyOnWrite } from "./wallets";
import { validatorWalletFactory, walletFactory } from "./wallets/factory";
import { registerIndexers } from "./wallets/indexers";

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

		this.app.bind(Identifiers.ValidatorWalletFactory).toFactory(() => validatorWalletFactory);

		this.app
			.bind(Identifiers.WalletRepository)
			.to(WalletRepositoryCopyOnWrite)
			.inRequestScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "copy-on-write"));

		this.app
			.bind(Identifiers.WalletFactory)
			.toFactory(({ container }) => walletFactory(container.get(Identifiers.WalletAttributes)))
			.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "copy-on-write"));

		this.app.bind(Identifiers.BlockState).to(BlockState);

		this.app.bind(Identifiers.StateStore).to(StateStore).inSingletonScope();

		this.app.bind(Identifiers.TransactionValidator).to(TransactionValidator);

		this.app.bind(Identifiers.TransactionValidatorFactory).toAutoFactory(Identifiers.TransactionValidator);

		this.app.bind(Identifiers.StateVerifier).to(StateVerifier);

		this.app.bind(Identifiers.State.ValidatorMutator).to(AttributeMutator);
		this.app.bind(Identifiers.State.ValidatorMutator).to(BalanceMutator);
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
}

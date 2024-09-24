import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import Joi from "joi";

import { AttributeRepository } from "./attributes/index.js";
import { stateRepositoryFactory } from "./factory.js";
import { Service } from "./service.js";
import { State } from "./state.js";
import { Store } from "./store.js";
import { walletFactory } from "./wallets/factory.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.State.AttributeRepository).to(AttributeRepository).inSingletonScope();
		const stateAttributeRepository = this.app.get<Contracts.State.AttributeRepository>(
			Identifiers.State.AttributeRepository,
		);
		stateAttributeRepository.set("height", Contracts.State.AttributeType.Number);
		stateAttributeRepository.set("totalRound", Contracts.State.AttributeType.Number);

		this.app.bind(Identifiers.State.Wallet.Attributes).to(AttributeRepository).inSingletonScope();
		const walletAttributeRepository = this.app.get<Contracts.State.AttributeRepository>(
			Identifiers.State.Wallet.Attributes,
		);
		walletAttributeRepository.set("balance", Contracts.State.AttributeType.BigNumber);
		walletAttributeRepository.set("nonce", Contracts.State.AttributeType.BigNumber);
		walletAttributeRepository.set("publicKey", Contracts.State.AttributeType.String);
		walletAttributeRepository.set("username", Contracts.State.AttributeType.String);
		walletAttributeRepository.set("validatorPublicKey", Contracts.State.AttributeType.String);
		walletAttributeRepository.set("validatorRank", Contracts.State.AttributeType.Number);
		walletAttributeRepository.set("validatorVoteBalance", Contracts.State.AttributeType.BigNumber);
		walletAttributeRepository.set("validatorLastBlock", Contracts.State.AttributeType.Object);
		walletAttributeRepository.set("validatorForgedFees", Contracts.State.AttributeType.BigNumber);
		walletAttributeRepository.set("validatorForgedRewards", Contracts.State.AttributeType.BigNumber);
		walletAttributeRepository.set("validatorForgedTotal", Contracts.State.AttributeType.BigNumber);
		walletAttributeRepository.set("validatorProducedBlocks", Contracts.State.AttributeType.Number);
		walletAttributeRepository.set("validatorApproval", Contracts.State.AttributeType.Number);
		walletAttributeRepository.set("validatorResigned", Contracts.State.AttributeType.Boolean);
		walletAttributeRepository.set("vote", Contracts.State.AttributeType.String);

		this.app.bind(Identifiers.State.Wallet.Factory).toFactory(walletFactory);


		this.app.bind(Identifiers.State.Store.Factory).toFactory(
			({ container }) =>
				(originalstore?: Store) =>
					container.resolve(Store).configure(originalstore),
		);

		this.app.bind(Identifiers.State.StateRepository.Factory).toFactory(stateRepositoryFactory);

		this.app.bind(Identifiers.State.Service).to(Service).inSingletonScope();
		this.app.bind(Identifiers.State.State).to(State).inSingletonScope();
	}

	public configSchema(): Joi.AnySchema {
		return Joi.object({
			snapshots: Joi.object({
				enabled: Joi.bool().required(),
				interval: Joi.number().integer().min(1).required(),
				retainFiles: Joi.number().integer().min(1).required(),
				skipUnknownAttributes: Joi.bool().required(),
			}).required(),
		})
			.required()
			.unknown(true);
	}
}

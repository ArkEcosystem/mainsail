import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import Joi from "joi";

import { AttributeRepository } from "./attributes";
import { AttributeMutator } from "./mutators/attribute";
import { BalanceMutator } from "./mutators/balance";
import { Service } from "./service";
import { Exporter } from "./snapshots/exporter";
import { Importer } from "./snapshots/importer";
import { StateStore } from "./state-store";
import { StateVerifier } from "./state-verifier";
import { IndexSet, WalletRepository, WalletRepositoryClone, WalletRepositoryCopyOnWrite } from "./wallets";
import { validatorWalletFactory, walletFactory } from "./wallets/factory";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		// Register indexes
		this.app.bind(Identifiers.WalletRepositoryIndexSet).to(IndexSet).inSingletonScope();
		const indexSet = this.app.get<Contracts.State.IndexSet>(Identifiers.WalletRepositoryIndexSet);
		indexSet.set(Contracts.State.WalletIndexes.Addresses);
		indexSet.set(Contracts.State.WalletIndexes.PublicKeys);
		indexSet.set(Contracts.State.WalletIndexes.Usernames);
		// TODO: remove resignations index
		indexSet.set(Contracts.State.WalletIndexes.Resignations);

		this.app.bind(Identifiers.StateAttributes).to(AttributeRepository).inSingletonScope();
		const stateAttributeRepository = this.app.get<AttributeRepository>(Identifiers.StateAttributes);
		stateAttributeRepository.set("height", Contracts.State.AttributeType.Number);
		stateAttributeRepository.set("totalRound", Contracts.State.AttributeType.Number);

		this.app.bind(Identifiers.WalletAttributes).to(AttributeRepository).inSingletonScope();
		const walletAttributeRepository = this.app.get<AttributeRepository>(Identifiers.WalletAttributes);
		walletAttributeRepository.set("balance", Contracts.State.AttributeType.BigNumber);
		walletAttributeRepository.set("nonce", Contracts.State.AttributeType.BigNumber);
		walletAttributeRepository.set("publicKey", Contracts.State.AttributeType.String);
		walletAttributeRepository.set("validatorUsername", Contracts.State.AttributeType.String);
		walletAttributeRepository.set("validatorConsensusPublicKey", Contracts.State.AttributeType.String);
		walletAttributeRepository.set("validatorRank", Contracts.State.AttributeType.Number);
		walletAttributeRepository.set("validatorVoteBalance", Contracts.State.AttributeType.BigNumber);
		walletAttributeRepository.set("validatorLastBlock", Contracts.State.AttributeType.Object);
		walletAttributeRepository.set("validatorForgedFees", Contracts.State.AttributeType.BigNumber);
		walletAttributeRepository.set("validatorForgedRewards", Contracts.State.AttributeType.BigNumber);
		walletAttributeRepository.set("validatorForgedTotal", Contracts.State.AttributeType.BigNumber);
		walletAttributeRepository.set("validatorProducedBlocks", Contracts.State.AttributeType.Number);
		walletAttributeRepository.set("validatorApproval", Contracts.State.AttributeType.Number);

		this.app
			.bind(Identifiers.WalletFactory)
			.toFactory(({ container }) => walletFactory(container.get(Identifiers.WalletAttributes)));

		this.app.bind(Identifiers.WalletRepositoryFactory).toFactory(
			({ container }) =>
				() =>
					container.resolve(WalletRepository),
		);

		this.app.bind(Identifiers.WalletRepositoryCloneFactory).toFactory(
			({ container }) =>
				(walletRepository: WalletRepository) =>
					container.resolve(WalletRepositoryClone).configure(walletRepository),
		);

		this.app.bind(Identifiers.WalletRepositoryCopyOnWriteFactory).toFactory(
			({ container }) =>
				(walletRepository: WalletRepository) =>
					container.resolve(WalletRepositoryCopyOnWrite).configure(walletRepository),
		);

		this.app.bind(Identifiers.ValidatorWalletFactory).toFactory(() => validatorWalletFactory);

		this.app.bind(Identifiers.StateStoreFactory).toFactory(
			({ container }) =>
				(originalStateStore?: StateStore) =>
					container.resolve(StateStore).configure(originalStateStore),
		);

		this.app.bind(Identifiers.StateImporter).to(Importer);
		this.app.bind(Identifiers.StateExporter).to(Exporter);

		this.app.bind(Identifiers.StateService).to(Service).inSingletonScope();
		this.app.bind(Identifiers.StateVerifier).to(StateVerifier);

		this.app.bind(Identifiers.State.ValidatorMutator).to(AttributeMutator);
		this.app.bind(Identifiers.State.ValidatorMutator).to(BalanceMutator);
	}

	public configSchema(): Joi.AnySchema {
		return Joi.object({
			export: Joi.object({
				enabled: Joi.bool().required(),
				interval: Joi.number().integer().min(1).required(),
				retainFiles: Joi.number().integer().min(1).required(),
			}).required(),
		})
			.required()
			.unknown(true);
	}
}

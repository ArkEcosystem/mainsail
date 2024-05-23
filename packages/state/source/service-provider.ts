import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import Joi from "joi";

import { AttributeRepository } from "./attributes/index.js";
import { AttributeMutator } from "./mutators/attribute.js";
import { BalanceMutator } from "./mutators/balance.js";
import { Service } from "./service.js";
import { Exporter } from "./snapshots/exporter.js";
import { Importer } from "./snapshots/importer.js";
import { SnapshotService } from "./snapshots/snapshot-service.js";
import { State } from "./state.js";
import { StateVerifier } from "./state-verifier.js";
import { Store } from "./store.js";
import { validatorWalletFactory, walletFactory } from "./wallets/factory.js";
import { IndexSet, WalletRepository, WalletRepositoryBySender, WalletRepositoryClone } from "./wallets/index.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		// Register indexes
		this.app.bind(Identifiers.State.WalletRepository.IndexSet).to(IndexSet).inSingletonScope();
		const indexSet = this.app.get<Contracts.State.IndexSet>(Identifiers.State.WalletRepository.IndexSet);
		indexSet.set(Contracts.State.WalletIndexes.Addresses);
		indexSet.set(Contracts.State.WalletIndexes.PublicKeys);
		indexSet.set(Contracts.State.WalletIndexes.Usernames);
		indexSet.set(Contracts.State.WalletIndexes.Validators);
		// TODO: remove resignations index
		indexSet.set(Contracts.State.WalletIndexes.Resignations);

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

		this.app
			.bind(Identifiers.State.Wallet.Factory)
			.toFactory(({ container }) => walletFactory(container.get(Identifiers.Application.Instance)));

		this.app.bind(Identifiers.State.WalletRepository.Base.Factory).toFactory(
			({ container }) =>
				(walletRepository: WalletRepository) =>
					walletRepository
						? container.resolve(WalletRepositoryClone).configure(walletRepository)
						: container.resolve(WalletRepository),
		);

		this.app.bind(Identifiers.State.WalletRepository.BySender.Factory).toFactory(
			({ container }) =>
				async (walletRepository: WalletRepository, publicKey: string) =>
					await container.resolve(WalletRepositoryBySender).configure(walletRepository, publicKey),
		);

		this.app.bind(Identifiers.State.ValidatorWallet.Factory).toFactory(() => validatorWalletFactory);

		this.app.bind(Identifiers.State.Store.Factory).toFactory(
			({ container }) =>
				(originalstore?: Store) =>
					container.resolve(Store).configure(originalstore),
		);

		this.app.bind(Identifiers.State.Snapshot.Importer).to(Importer).inSingletonScope();
		this.app.bind(Identifiers.State.Snapshot.Exporter).to(Exporter).inSingletonScope();
		this.app.bind(Identifiers.State.Snapshot.Service).to(SnapshotService).inSingletonScope();

		this.app.bind(Identifiers.State.Service).to(Service).inSingletonScope();
		this.app.bind(Identifiers.State.State).to(State).inSingletonScope();
		this.app.bind(Identifiers.State.Verifier).to(StateVerifier);

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

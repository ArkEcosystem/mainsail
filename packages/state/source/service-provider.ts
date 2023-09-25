import { Selectors } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { AttributeRepository } from "./attributes";
import { BlockState } from "./block-state";
import { AttributeMutator } from "./mutators/attribute";
import { BalanceMutator } from "./mutators/balance";
import { StateVerifier } from "./state-verifier";
import { StateStore } from "./stores/state";
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
		const stateAttributeRepository = this.app.get<AttributeRepository>(Identifiers.WalletAttributes);
		stateAttributeRepository.set("height", Contracts.State.AttributeType.Number);
		stateAttributeRepository.set("committedRound", Contracts.State.AttributeType.Number);

		this.app.bind(Identifiers.WalletAttributes).to(AttributeRepository).inSingletonScope();
		const walletAttributeRepository = this.app.get<AttributeRepository>(Identifiers.WalletAttributes);
		walletAttributeRepository.set("balance", Contracts.State.AttributeType.BigNumber);
		walletAttributeRepository.set("nonce", Contracts.State.AttributeType.BigNumber);
		walletAttributeRepository.set("publicKey", Contracts.State.AttributeType.String);

		this.app
			.bind(Identifiers.WalletRepository)
			.to(WalletRepository)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "blockchain"));

		this.app
			.bind(Identifiers.WalletFactory)
			.toFactory(({ container }) => walletFactory(container.get(Identifiers.WalletAttributes)));

		this.app.bind(Identifiers.WalletRepositoryCloneFactory).toFactory(
			({ container }) =>
				() =>
					container
						.resolve(WalletRepositoryClone)
						.configure(container.getTagged(Identifiers.WalletRepository, "state", "blockchain")),
		);

		this.app.bind(Identifiers.ValidatorWalletFactory).toFactory(() => validatorWalletFactory);

		this.app
			.bind(Identifiers.WalletRepository)
			.to(WalletRepositoryCopyOnWrite)
			.inRequestScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "copy-on-write"));

		this.app.bind(Identifiers.BlockState).to(BlockState);

		this.app.bind(Identifiers.StateStore).to(StateStore).inSingletonScope();

		this.app.bind(Identifiers.StateVerifier).to(StateVerifier);

		this.app.bind(Identifiers.State.ValidatorMutator).to(AttributeMutator);
		this.app.bind(Identifiers.State.ValidatorMutator).to(BalanceMutator);
	}

	public async bootWhen(serviceProvider?: string): Promise<boolean> {
		return serviceProvider === "@mainsail/database";
	}
}

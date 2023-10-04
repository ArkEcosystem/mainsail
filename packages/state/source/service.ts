import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Service {
	@inject(Identifiers.StateStore)
	private readonly baseStateStore!: Contracts.State.StateStore;

	@inject(Identifiers.WalletRepository)
	private readonly baseWalletRepository!: Contracts.State.WalletRepository;

	@inject(Identifiers.WalletRepositoryCloneFactory)
	private readonly walletRepositoryCloneFactory!: Contracts.State.WalletRepositoryCloneFactory;

	public getStateStore(): Contracts.State.StateStore {
		return this.baseStateStore;
	}

	public getWalletRepository(): Contracts.State.WalletRepository {
		return this.baseWalletRepository;
	}

	public createWalletRepositoryClone(): Contracts.State.WalletRepository {
		return this.walletRepositoryCloneFactory(this.getWalletRepository());
	}
}

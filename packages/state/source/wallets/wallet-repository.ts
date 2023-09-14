import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

import { WalletHolder } from "./wallet-holder";
import { WalletIndex } from "./wallet-index";

// @TODO review the implementation
@injectable()
export class WalletRepository implements Contracts.State.WalletRepository {
	@inject(Identifiers.WalletRepositoryIndexSet)
	protected readonly indexSet!: Contracts.State.IndexSet;

	@inject(Identifiers.WalletFactory)
	private readonly createWalletFactory!: Contracts.State.WalletFactory;

	@inject(Identifiers.Cryptography.Identity.AddressFactory)
	protected readonly addressFactory!: Contracts.Crypto.IAddressFactory;

	protected readonly indexes: Record<string, Contracts.State.WalletIndex> = {};

	@postConstruct()
	public initialize(): void {
		for (const name of this.indexSet.all()) {
			if (this.indexes[name]) {
				throw new Exceptions.WalletIndexAlreadyRegisteredError(name);
			}
			this.indexes[name] = new WalletIndex();
		}
	}

	public getIndex(name: string): Contracts.State.WalletIndex {
		if (!this.indexes[name]) {
			throw new Exceptions.WalletIndexNotFoundError(name);
		}
		return this.indexes[name];
	}

	public getIndexNames(): string[] {
		return Object.keys(this.indexes);
	}

	public allByAddress(): ReadonlyArray<Contracts.State.Wallet> {
		return this.allByIndex(Contracts.State.WalletIndexes.Addresses);
	}

	public allByPublicKey(): ReadonlyArray<Contracts.State.Wallet> {
		return this.allByIndex(Contracts.State.WalletIndexes.PublicKeys);
	}

	public allByUsername(): ReadonlyArray<Contracts.State.Wallet> {
		return this.allByIndex(Contracts.State.WalletIndexes.Usernames);
	}

	public allByIndex(indexName: string): ReadonlyArray<Contracts.State.Wallet> {
		return this.getIndex(indexName)
			.values()
			.map((walletHolder) => walletHolder.getWallet());
	}

	public findByAddress(address: string): Contracts.State.Wallet {
		return this.findOrCreate(address).getWallet();
	}

	public async findByPublicKey(publicKey: string): Promise<Contracts.State.Wallet> {
		const index = this.getIndex(Contracts.State.WalletIndexes.PublicKeys);
		if (publicKey && !index.has(publicKey)) {
			const walletHolder = this.findOrCreate(await this.addressFactory.fromPublicKey(publicKey));
			walletHolder.getWallet().setPublicKey(publicKey);
			index.set(publicKey, walletHolder);
		}
		const wallet = index.get(publicKey)!;
		return wallet.getWallet();
	}

	public findByUsername(username: string): Contracts.State.Wallet {
		return this.findByIndex(Contracts.State.WalletIndexes.Usernames, username);
	}

	public findByIndex(index: string, key: string): Contracts.State.Wallet {
		if (!this.hasByIndex(index, key)) {
			throw new Error(`Wallet ${key} doesn't exist in index ${index}`);
		}
		return this.getIndex(index).get(key)!.getWallet();
	}

	public hasByAddress(address: string): boolean {
		return this.hasByIndex(Contracts.State.WalletIndexes.Addresses, address);
	}

	public hasByPublicKey(publicKey: string): boolean {
		return this.hasByIndex(Contracts.State.WalletIndexes.PublicKeys, publicKey);
	}

	public hasByUsername(username: string): boolean {
		return this.hasByIndex(Contracts.State.WalletIndexes.Usernames, username);
	}

	public hasByIndex(indexName: string, key: string): boolean {
		return this.getIndex(indexName).has(key);
	}

	public setOnIndex(index: string, key: string, wallet: Contracts.State.Wallet): void {
		const walletHolder = this.findHolder(wallet);

		this.getIndex(index).set(key, walletHolder);
	}

	public forgetOnIndex(index: string, key: string): void {
		this.getIndex(index).forget(key);
	}

	public reset(): void {
		for (const walletIndex of Object.values(this.indexes)) {
			walletIndex.clear();
		}
	}

	protected cloneWallet(origin: WalletRepository, wallet: Contracts.State.Wallet): Contracts.State.WalletHolder {
		const walletHolder = origin.findHolder(wallet);
		const walletHolderClone = walletHolder.clone();

		for (const indexName of origin.getIndexNames()) {
			const walletKeys = origin.getIndex(indexName).walletKeys(walletHolder);

			const index = this.getIndex(indexName);
			for (const key of walletKeys) {
				index.set(key, walletHolderClone);
			}
		}

		return walletHolderClone;
	}

	protected findOrCreate(address: string): Contracts.State.WalletHolder {
		const index = this.getIndex(Contracts.State.WalletIndexes.Addresses);
		if (!index.has(address)) {
			index.set(address, new WalletHolder(this.createWalletFactory(address)));
		}
		return index.get(address)!;
	}

	protected findHolder(wallet: Contracts.State.Wallet): Contracts.State.WalletHolder {
		const index = this.getIndex(Contracts.State.WalletIndexes.Addresses);

		const walletHolder = index.get(wallet.getAddress());

		if (!walletHolder) {
			throw new Error("Wallet holder not found");
		}

		if (walletHolder.getWallet() !== wallet) {
			throw new Error("Wallet missmatch");
		}

		return walletHolder;
	}
}

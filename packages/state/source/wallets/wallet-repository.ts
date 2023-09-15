import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

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
		return this.getIndex(indexName).values();
	}

	public findByAddress(address: string): Contracts.State.Wallet {
		return this.findOrCreate(address);
	}

	public async findByPublicKey(publicKey: string): Promise<Contracts.State.Wallet> {
		const index = this.getIndex(Contracts.State.WalletIndexes.PublicKeys);
		if (publicKey && !index.has(publicKey)) {
			const wallet = this.findOrCreate(await this.addressFactory.fromPublicKey(publicKey));
			wallet.setPublicKey(publicKey);
			index.set(publicKey, wallet);
		}
		return index.get(publicKey)!;
	}

	public findByUsername(username: string): Contracts.State.Wallet {
		return this.findByIndex(Contracts.State.WalletIndexes.Usernames, username);
	}

	public findByIndex(index: string, key: string): Contracts.State.Wallet {
		if (!this.hasByIndex(index, key)) {
			throw new Error(`Wallet ${key} doesn't exist in index ${index}`);
		}
		return this.getIndex(index).get(key)!;
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
		this.getIndex(index).set(key, wallet);
	}

	public forgetOnIndex(index: string, key: string): void {
		this.getIndex(index).forget(key);
	}

	public reset(): void {
		for (const walletIndex of Object.values(this.indexes)) {
			walletIndex.clear();
		}
	}

	protected cloneWallet(origin: WalletRepository, wallet: Contracts.State.Wallet): Contracts.State.Wallet {
		return wallet.clone();

		// TODO: Clone indexes
		// for (const indexName of origin.indexSet.all()) {
		// 	const walletKeys = origin.getIndex(indexName).walletKeys(wallet);

		// 	const index = this.getIndex(indexName);
		// 	for (const key of walletKeys) {
		// 		index.set(key, walletClone);
		// 	}
		// }
	}

	protected findOrCreate(address: string): Contracts.State.Wallet {
		const index = this.getIndex(Contracts.State.WalletIndexes.Addresses);
		if (!index.has(address)) {
			index.set(address, this.createWalletFactory(address));
		}
		return index.get(address)!;
	}
}

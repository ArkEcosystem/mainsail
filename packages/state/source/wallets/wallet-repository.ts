import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

import { WalletIndex } from "./wallet-index";

@injectable()
export class WalletRepository implements Contracts.State.WalletRepository {
	@inject(Identifiers.State.WalletRepository.IndexSet)
	protected readonly indexSet!: Contracts.State.IndexSet;

	@inject(Identifiers.State.Wallet.Factory)
	protected readonly createWalletFactory!: Contracts.State.WalletFactory;

	@inject(Identifiers.Cryptography.Identity.Address.Factory)
	protected readonly addressFactory!: Contracts.Crypto.AddressFactory;

	protected readonly indexes: Record<string, Contracts.State.WalletIndex> = {};

	@postConstruct()
	public initialize(): void {
		for (const name of this.indexSet.all()) {
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

	public allValidators(): ReadonlyArray<Contracts.State.Wallet> {
		return this.allByIndex(Contracts.State.WalletIndexes.Validators);
	}

	public allByIndex(indexName: string): ReadonlyArray<Contracts.State.Wallet> {
		return this.getIndex(indexName).values();
	}

	public findByAddress(address: string): Contracts.State.Wallet {
		return this.findOrCreate(address);
	}

	public async findByPublicKey(publicKey: string): Promise<Contracts.State.Wallet> {
		const index = this.getIndex(Contracts.State.WalletIndexes.PublicKeys);
		if (!index.has(publicKey)) {
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
			throw new Error(`Wallet ${key} doesn't exist on index ${index}`);
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

	public setDirtyWallet(wallet: Contracts.State.Wallet): void {}

	protected findOrCreate(address: string): Contracts.State.Wallet {
		const index = this.getIndex(Contracts.State.WalletIndexes.Addresses);
		if (!index.has(address)) {
			index.set(address, this.createWalletFactory(address, this));
		}
		return index.get(address)!;
	}
}

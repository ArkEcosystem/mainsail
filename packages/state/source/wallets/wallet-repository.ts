import { inject, injectable, multiInject, postConstruct } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Utils as AppUtils } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

import { WalletHolder } from "./wallet-holder";
import { WalletIndex } from "./wallet-index";

// @TODO review the implementation
@injectable()
export class WalletRepository implements Contracts.State.WalletRepository {
	@multiInject(Identifiers.WalletRepositoryIndexerIndex)
	protected readonly indexerIndexes!: Contracts.State.WalletIndexerIndex[];

	@inject(Identifiers.WalletFactory)
	private readonly createWalletFactory!: Contracts.State.WalletFactory;

	@inject(Identifiers.Cryptography.Identity.AddressFactory)
	protected readonly addressFactory: Contracts.Crypto.IAddressFactory;

	protected readonly indexes: Record<string, Contracts.State.WalletIndex> = {};

	@postConstruct()
	public initialize(): void {
		for (const { name, indexer, autoIndex } of this.indexerIndexes) {
			if (this.indexes[name]) {
				throw new Exceptions.WalletIndexAlreadyRegisteredError(name);
			}
			this.indexes[name] = new WalletIndex(indexer, autoIndex);
		}
	}

	public createWallet(address: string): Contracts.State.Wallet {
		return this.createWalletFactory(address);
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
		return this.getIndex(Contracts.State.WalletIndexes.Addresses)
			.values()
			.map((walletHolder) => walletHolder.getWallet());
	}

	public allByPublicKey(): ReadonlyArray<Contracts.State.Wallet> {
		return this.getIndex(Contracts.State.WalletIndexes.PublicKeys)
			.values()
			.map((walletHolder) => walletHolder.getWallet());
	}

	public allByUsername(): ReadonlyArray<Contracts.State.Wallet> {
		return this.getIndex(Contracts.State.WalletIndexes.Usernames)
			.values()
			.map((walletHolder) => walletHolder.getWallet());
	}

	public allByIndex(indexName: string): ReadonlyArray<Contracts.State.Wallet> {
		return this.getIndex(indexName)
			.values()
			.map((walletHolder) => walletHolder.getWallet());
	}

	public findByAddress(address: string): Contracts.State.Wallet {
		return this.findByAddressInternal(address).getWallet();
	}

	protected findByAddressInternal(address: string): Contracts.State.WalletHolder {
		const index = this.getIndex(Contracts.State.WalletIndexes.Addresses);
		if (address && !index.has(address)) {
			index.set(address, new WalletHolder(this.createWallet(address)));
		}
		const walletHolder: Contracts.State.WalletHolder | undefined = index.get(address);
		AppUtils.assert.defined(walletHolder);
		return walletHolder;
	}

	public async findByPublicKey(publicKey: string): Promise<Contracts.State.Wallet> {
		const index = this.getIndex(Contracts.State.WalletIndexes.PublicKeys);
		if (publicKey && !index.has(publicKey)) {
			const walletHolder = this.findByAddressInternal(await this.addressFactory.fromPublicKey(publicKey));
			walletHolder.getWallet().setPublicKey(publicKey);
			index.set(publicKey, walletHolder);
		}
		const wallet: Contracts.State.WalletHolder | undefined = index.get(publicKey);
		AppUtils.assert.defined(wallet);
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

	public findByIndexes(indexes: string[], key: string): Contracts.State.Wallet {
		for (const index of indexes) {
			if (this.hasByIndex(index, key)) {
				return this.findByIndex(index, key);
			}
		}
		throw new Error(`Wallet ${key} doesn't exist in indexes ${indexes.join(", ")}`);
	}

	public has(key: string): boolean {
		return Object.values(this.indexes).some((index) => index.has(key));
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

	public async getNonce(publicKey: string): Promise<BigNumber> {
		if (this.hasByPublicKey(publicKey)) {
			return (await this.findByPublicKey(publicKey)).getNonce();
		}

		return BigNumber.ZERO;
	}

	public index(wallets: Contracts.State.Wallet | Contracts.State.Wallet[]): void {
		if (!Array.isArray(wallets)) {
			this.indexWallet(wallets);
		} else {
			for (const wallet of wallets) {
				this.indexWallet(wallet);
			}
		}
	}

	public setOnIndex(index: string, key: string, wallet: Contracts.State.Wallet): void {
		const walletHolder = this.findByAddressInternal(wallet.getAddress());

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

	public cloneWallet(
		origin: Contracts.State.WalletRepository,
		wallet: Contracts.State.Wallet,
	): Contracts.State.WalletHolder {
		const walletHolder = this.findByAddressInternal(wallet.getAddress());
		const walletHolderClone = new WalletHolder(wallet.clone());

		for (const indexName of origin.getIndexNames()) {
			const walletKeys = origin.getIndex(indexName).walletKeys(walletHolder);

			const index = this.getIndex(indexName);
			for (const key of walletKeys) {
				index.set(key, walletHolderClone);
			}
		}

		return walletHolderClone;
	}

	protected indexWallet(wallet: Contracts.State.Wallet): void {
		const walletHolder = this.findByAddressInternal(wallet.getAddress());

		for (const index of Object.values(this.indexes).filter((index) => index.autoIndex)) {
			index.forgetWallet(walletHolder);
			index.index(walletHolder);
		}
	}
}

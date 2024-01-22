import { injectable, postConstruct } from "@mainsail/container";
import { Contracts, Exceptions } from "@mainsail/contracts";

import { WalletRepository } from "./wallet-repository";

@injectable()
export class WalletRepositoryClone extends WalletRepository implements Contracts.State.WalletRepository {
	#originalWalletRepository!: WalletRepository;

	readonly #forgetIndexes: Record<string, Set<string>> = {};
	readonly #dirtyWallets = new Set<Contracts.State.Wallet>();

	@postConstruct()
	public initialize(): void {
		super.initialize();

		for (const name of this.indexSet.all()) {
			this.#forgetIndexes[name] = new Set();
		}
	}

	public configure(originalWalletRepository: WalletRepository): WalletRepositoryClone {
		this.#originalWalletRepository = originalWalletRepository;
		return this;
	}

	public allByIndex(indexName: string): ReadonlyArray<Contracts.State.Wallet> {
		const result: Contracts.State.Wallet[] = [];

		for (const [key, wallet] of this.getIndex(indexName).entries()) {
			if (!this.#getForgetSet(indexName).has(key)) {
				result.push(wallet);
			}
		}

		for (const [key, wallet] of this.#originalWalletRepository.getIndex(indexName).entries()) {
			if (!this.#getForgetSet(indexName).has(key) && !this.getIndex(indexName).has(key)) {
				result.push(this.findByAddress(wallet.getAddress()));
			}
		}

		return result;
	}

	public findByAddress(address: string): Contracts.State.Wallet {
		const wallet = this.#findByIndex(Contracts.State.WalletIndexes.Addresses, address);

		if (wallet) {
			return wallet;
		}

		return this.findOrCreate(address);
	}

	public async findByPublicKey(publicKey: string): Promise<Contracts.State.Wallet> {
		const foundWallet = this.#findByIndex(Contracts.State.WalletIndexes.PublicKeys, publicKey);

		if (foundWallet) {
			return foundWallet;
		}

		const wallet = this.findByAddress(await this.addressFactory.fromPublicKey(publicKey));
		wallet.setPublicKey(publicKey);
		this.getIndex(Contracts.State.WalletIndexes.PublicKeys).set(publicKey, wallet);
		return wallet;
	}

	public findByIndex(index: string, key: string): Contracts.State.Wallet {
		const wallet = this.#findByIndex(index, key);

		if (!wallet) {
			throw new Error(`Wallet ${key} doesn't exist on index ${index}`);
		}

		return wallet;
	}

	public hasByIndex(indexName: string, key: string): boolean {
		return (
			this.getIndex(indexName).has(key) ||
			(this.#originalWalletRepository.getIndex(indexName).has(key) && !this.#getForgetSet(indexName).has(key))
		);
	}

	public setOnIndex(index: string, key: string, wallet: Contracts.State.Wallet): void {
		this.getIndex(index).set(key, wallet);
		this.#getForgetSet(index).delete(key);
	}

	public forgetOnIndex(index: string, key: string): void {
		if (this.getIndex(index).has(key) || this.#originalWalletRepository.getIndex(index).has(key)) {
			this.getIndex(index).forget(key);
			this.#getForgetSet(index).add(key);
		}
	}

	public getDirtyWallets(): IterableIterator<Contracts.State.Wallet> {
		return this.#dirtyWallets.values();
	}

	public setDirtyWallet(wallet: Contracts.State.Wallet): void {
		this.#dirtyWallets.add(wallet);
	}

	public commitChanges(): void {
		// Merge clones to originals
		for (const wallet of this.#dirtyWallets.values()) {
			wallet.commitChanges(this.#originalWalletRepository);
		}

		for (const indexName of this.indexSet.all()) {
			// Update indexes
			for (const [key, wallet] of this.getIndex(indexName).entries()) {
				this.#originalWalletRepository.setOnIndex(
					indexName,
					key,
					wallet.isClone() ? wallet.getOriginal() : wallet,
				);
			}

			// Remove from forget indexes
			for (const key of this.#getForgetSet(indexName).values()) {
				this.#originalWalletRepository.forgetOnIndex(indexName, key);
			}
		}
	}

	#findByIndex(index: string, key: string): Contracts.State.Wallet | undefined {
		const localIndex = this.getIndex(index);
		if (localIndex.has(key)) {
			return localIndex.get(key)!;
		}

		const originalIndex = this.#originalWalletRepository.getIndex(index);
		if (originalIndex.has(key) && !this.#getForgetSet(index).has(key)) {
			const originalWallet = originalIndex.get(key)!;

			const localAddressIndex = this.getIndex(Contracts.State.WalletIndexes.Addresses);

			if (!localAddressIndex.has(originalWallet.getAddress())) {
				localAddressIndex.set(originalWallet.getAddress(), originalWallet.clone(this));
			}

			return localAddressIndex.get(originalWallet.getAddress())!;
		}

		return undefined;
	}

	#getForgetSet(name: string): Set<string> {
		if (!this.#forgetIndexes[name]) {
			throw new Exceptions.WalletIndexNotFoundError(name);
		}
		return this.#forgetIndexes[name];
	}
}

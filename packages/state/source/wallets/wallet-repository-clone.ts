import { inject, injectable, postConstruct, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

import { WalletRepository } from "./wallet-repository";

@injectable()
export class WalletRepositoryClone extends WalletRepository implements Contracts.State.WalletRepositoryClone {
	@inject(Identifiers.WalletRepository)
	@tagged("state", "blockchain")
	private readonly originalWalletRepository!: WalletRepository;

	readonly #forgetIndexes: Record<string, Set<string>> = {};

	@postConstruct()
	public initialize(): void {
		super.initialize();

		for (const name of this.indexSet.all()) {
			this.#forgetIndexes[name] = new Set();
		}
	}

	public allByIndex(indexName: string): ReadonlyArray<Contracts.State.Wallet> {
		this.#cloneAllByIndex(indexName);
		return this.getIndex(indexName).values();
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
			(this.originalWalletRepository.getIndex(indexName).has(key) && !this.#getForgetSet(indexName).has(key))
		);
	}

	public setOnIndex(index: string, key: string, wallet: Contracts.State.Wallet): void {
		this.getIndex(index).set(key, wallet);
		this.#getForgetSet(index).delete(key);
	}

	public forgetOnIndex(index: string, key: string): void {
		if (this.getIndex(index).has(key) || this.originalWalletRepository.getIndex(index).has(key)) {
			this.getIndex(index).forget(key);
			this.#getForgetSet(index).add(key);
		}
	}

	public getDirtyWallets(): ReadonlyArray<Contracts.State.Wallet> {
		return this.getIndex(Contracts.State.WalletIndexes.Addresses)
			.values()
			.filter((walletHolder) => walletHolder.isChanged());
	}

	public commitChanges(): void {
		// Merge clones to originals
		for (const wallet of this.getDirtyWallets()) {
			wallet.commitChanges();
		}

		for (const indexName of this.indexSet.all()) {
			// Update indexes
			for (const [key, wallet] of this.getIndex(indexName).entries()) {
				this.originalWalletRepository.setOnIndex(
					indexName,
					key,
					wallet.isClone() ? wallet.getOriginal() : wallet,
				);
			}

			// Remove from forget indexes
			for (const key of this.#getForgetSet(indexName).values()) {
				this.originalWalletRepository.forgetOnIndex(indexName, key);
			}
		}
	}

	#findByIndex(index: string, key: string): Contracts.State.Wallet | undefined {
		const localIndex = this.getIndex(index);
		if (localIndex.has(key)) {
			return localIndex.get(key)!;
		}

		const originalIndex = this.originalWalletRepository.getIndex(index);
		if (originalIndex.has(key) && !this.#getForgetSet(index).has(key)) {
			const originalWallet = originalIndex.get(key)!;

			const localAddressIndex = this.getIndex(Contracts.State.WalletIndexes.Addresses);

			if (!localAddressIndex.has(originalWallet.getAddress())) {
				localAddressIndex.set(originalWallet.getAddress(), originalWallet.clone());
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

	#cloneAllByIndex(indexName: string) {
		for (const wallet of this.originalWalletRepository.getIndex(indexName).values()) {
			this.findByAddress(wallet.getAddress());
		}
	}
}

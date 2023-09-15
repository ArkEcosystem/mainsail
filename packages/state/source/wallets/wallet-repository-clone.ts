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
		if (super.hasByIndex(Contracts.State.WalletIndexes.Addresses, address)) {
			return super.findByIndex(Contracts.State.WalletIndexes.Addresses, address);
		}

		if (this.originalWalletRepository.hasByAddress(address)) {
			const walletToClone = this.originalWalletRepository.findByAddress(address);
			return this.cloneWallet(this.originalWalletRepository, walletToClone);
		}

		return this.findOrCreate(address);
	}

	public async findByPublicKey(publicKey: string): Promise<Contracts.State.Wallet> {
		if (!super.hasByIndex(Contracts.State.WalletIndexes.PublicKeys, publicKey)) {
			const wallet = this.findByAddress(await this.addressFactory.fromPublicKey(publicKey));
			wallet.setPublicKey(publicKey);
			this.getIndex(Contracts.State.WalletIndexes.PublicKeys).set(publicKey, wallet);
		}

		return super.findByIndex(Contracts.State.WalletIndexes.PublicKeys, publicKey);
	}

	public findByIndex(index: string, key: string): Contracts.State.Wallet {
		if (super.hasByIndex(index, key)) {
			return this.getIndex(index).get(key)!;
		}

		const walletToClone = this.originalWalletRepository.findByIndex(index, key);
		return this.cloneWallet(this.originalWalletRepository, walletToClone);
	}

	public hasByIndex(indexName: string, key: string): boolean {
		return (
			this.getIndex(indexName).has(key) ||
			(this.originalWalletRepository.getIndex(indexName).has(key) && !this.#getForgetSet(indexName).has(key))
		);
	}

	public forgetOnIndex(index: string, key: string): void {
		if (this.getIndex(index).has(key) || this.originalWalletRepository.getIndex(index).has(key)) {
			this.getIndex(index).forget(key);
			this.#getForgetSet(index).add(key);
		}
	}

	public reset(): void {
		super.reset();
		for (const walletIndex of Object.values(this.#forgetIndexes)) {
			walletIndex.clear();
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
			wallet.applyChanges();
		}

		// Update indexes
		for (const indexName of this.indexSet.all()) {
			const localIndex = this.getIndex(indexName);
			const originalIndex = this.originalWalletRepository.getIndex(indexName);

			for (const [key, wallet] of localIndex.entries()) {
				originalIndex.set(key, wallet.isClone() ? wallet.getOriginal() : wallet);
			}
		}

		// Remove from forget indexes
		for (const indexName of this.indexSet.all()) {
			const originalIndex = this.originalWalletRepository.getIndex(indexName);

			for (const key of this.#getForgetSet(indexName).values()) {
				originalIndex.forget(key);
			}
		}
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

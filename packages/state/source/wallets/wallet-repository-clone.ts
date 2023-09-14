import { inject, injectable, postConstruct, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

import { WalletIndex } from "./wallet-index";
import { WalletRepository } from "./wallet-repository";

@injectable()
export class WalletRepositoryClone extends WalletRepository implements Contracts.State.WalletRepositoryClone {
	@inject(Identifiers.WalletRepository)
	@tagged("state", "blockchain")
	private readonly blockchainWalletRepository!: WalletRepository;

	readonly #forgetIndexes: Record<string, Contracts.State.WalletIndex> = {};

	@postConstruct()
	public initialize(): void {
		super.initialize();

		for (const { name } of this.indexerIndexes) {
			this.#forgetIndexes[name] = new WalletIndex();
		}
	}

	public allByIndex(indexName: string): ReadonlyArray<Contracts.State.Wallet> {
		this.#cloneAllByIndex(indexName);
		return this.getIndex(indexName)
			.values()
			.map((walletHolder) => walletHolder.getWallet());
	}

	public findByAddress(address: string): Contracts.State.Wallet {
		if (super.hasByIndex(Contracts.State.WalletIndexes.Addresses, address)) {
			return super.findByIndex(Contracts.State.WalletIndexes.Addresses, address);
		}

		if (this.blockchainWalletRepository.hasByAddress(address)) {
			const walletToClone = this.blockchainWalletRepository.findByAddress(address);
			return this.cloneWallet(this.blockchainWalletRepository, walletToClone).getWallet();
		}

		return this.findOrCreate(address).getWallet();
	}

	public async findByPublicKey(publicKey: string): Promise<Contracts.State.Wallet> {
		if (!super.hasByIndex(Contracts.State.WalletIndexes.PublicKeys, publicKey)) {
			const wallet = this.findByAddress(await this.addressFactory.fromPublicKey(publicKey));
			wallet.setPublicKey(publicKey);
			this.getIndex(Contracts.State.WalletIndexes.PublicKeys).set(publicKey, this.findHolder(wallet));
		}

		return super.findByIndex(Contracts.State.WalletIndexes.PublicKeys, publicKey);
	}

	public findByIndex(index: string, key: string): Contracts.State.Wallet {
		if (super.hasByIndex(index, key)) {
			return this.getIndex(index).get(key)!.getWallet();
		}

		const walletToClone = this.blockchainWalletRepository.findByIndex(index, key);
		return this.cloneWallet(this.blockchainWalletRepository, walletToClone).getWallet();
	}

	public hasByIndex(indexName: string, key: string): boolean {
		return (
			this.getIndex(indexName).has(key) ||
			(this.blockchainWalletRepository.getIndex(indexName).has(key) && !this.#getForgetIndex(indexName).has(key))
		);
	}

	public forgetOnIndex(index: string, key: string): void {
		if (this.getIndex(index).has(key) || this.blockchainWalletRepository.getIndex(index).has(key)) {
			const wallet = this.findByIndex(index, key);

			this.getIndex(index).forget(key);

			this.#getForgetIndex(index).set(key, this.findHolder(wallet));
		}
	}

	public reset(): void {
		super.reset();
		for (const walletIndex of Object.values(this.#forgetIndexes)) {
			walletIndex.clear();
		}
	}

	public getDirtyWallets(): ReadonlyArray<Contracts.State.WalletHolder> {
		return this.getIndex(Contracts.State.WalletIndexes.Addresses)
			.values()
			.filter((walletHolder) => walletHolder.getWallet().isChanged() || walletHolder.getOriginal() !== undefined);
	}

	public commitChanges(): void {
		// Replace clones with originals
		const changedHolders = this.getDirtyWallets();

		for (const holder of changedHolders) {
			const original = holder.getOriginal();
			if (original) {
				original.setWallet(holder.getWallet());
			}
		}

		// Update indexes
		for (const indexName of this.getIndexNames()) {
			const localIndex = this.getIndex(indexName);
			const originalIndex = this.blockchainWalletRepository.getIndex(indexName);

			for (const [key, holder] of localIndex.entries()) {
				originalIndex.set(key, holder.getOriginal() ?? holder);
			}
		}

		// Remove from forget indexes
		for (const indexName of this.getIndexNames()) {
			const forgetIndex = this.#getForgetIndex(indexName);
			const originalIndex = this.blockchainWalletRepository.getIndex(indexName);

			for (const [key] of forgetIndex.entries()) {
				originalIndex.forget(key);
			}
		}
	}

	#getForgetIndex(name: string): Contracts.State.WalletIndex {
		if (!this.#forgetIndexes[name]) {
			throw new Exceptions.WalletIndexNotFoundError(name);
		}
		return this.#forgetIndexes[name];
	}

	#cloneAllByIndex(indexName: string) {
		for (const wallet of this.blockchainWalletRepository.getIndex(indexName).values()) {
			this.findByAddress(wallet.getWallet().getAddress());
		}
	}
}

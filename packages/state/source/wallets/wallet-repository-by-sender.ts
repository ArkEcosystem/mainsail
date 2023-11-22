import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { WalletRepository } from "./wallet-repository";

@injectable()
export class WalletRepositoryBySender extends WalletRepository {
	#blockchainWalletRepository!: WalletRepository;

	public configure(walletRepository: WalletRepository): WalletRepositoryBySender {
		this.#blockchainWalletRepository = walletRepository;

		return this;
	}

	public async findByPublicKey(publicKey: string): Promise<Contracts.State.Wallet> {
		if (super.hasByIndex(Contracts.State.WalletIndexes.PublicKeys, publicKey)) {
			return super.findByIndex(Contracts.State.WalletIndexes.PublicKeys, publicKey);
		}

		const wallet = this.findByAddress(await this.addressFactory.fromPublicKey(publicKey));
		wallet.setPublicKey(publicKey);
		this.getIndex(Contracts.State.WalletIndexes.PublicKeys).set(publicKey, wallet);

		return wallet;
	}

	public findByAddress(address: string): Contracts.State.Wallet {
		const addressIndex = this.getIndex(Contracts.State.WalletIndexes.Addresses);
		if (addressIndex.has(address)) {
			return addressIndex.get(address)!;
		}

		if (this.#blockchainWalletRepository.hasByAddress(address)) {
			return this.#cloneWallet(address);
		}

		return this.findOrCreate(address);
	}

	public hasByIndex(index: string, key: string): boolean {
		if (super.hasByIndex(index, key)) {
			return true;
		}
		if (this.#blockchainWalletRepository.hasByIndex(index, key) === false) {
			return false;
		}

		return true;
	}

	public allValidators(): ReadonlyArray<Contracts.State.Wallet> {
		for (const wallet of this.#blockchainWalletRepository.allValidators()) {
			if (!super.hasByAddress(wallet.getAddress())) {
				this.#cloneWallet(wallet.getAddress());
			}
		}
		return super.allValidators();
	}

	#cloneWallet(address: string): Contracts.State.Wallet {
		const clone = this.#blockchainWalletRepository.findByAddress(address).clone(this);
		this.getIndex(Contracts.State.WalletIndexes.Addresses).set(address, clone);
		return clone;
	}
}

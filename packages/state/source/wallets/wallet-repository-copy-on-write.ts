import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { WalletRepository } from "./wallet-repository";

// ! This isn't copy-on-write, but copy-on-read and with many asterisks.
// ! It only covers current pool use-cases.
// ! It should be replaced with proper implementation eventually.

@injectable()
export class WalletRepositoryCopyOnWrite extends WalletRepository {
	@inject(Identifiers.WalletRepository)
	@tagged("state", "blockchain")
	private readonly blockchainWalletRepository!: WalletRepository;

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
		if (this.hasByAddress(address)) {
			return super.findByAddress(address);
		}

		if (this.blockchainWalletRepository.hasByAddress(address)) {
			return this.#cloneWallet(address);
		}

		return this.findOrCreate(address);
	}

	public hasByIndex(index: string, key: string): boolean {
		if (super.hasByIndex(index, key)) {
			return true;
		}
		if (this.blockchainWalletRepository.hasByIndex(index, key) === false) {
			return false;
		}

		return true;
	}

	public allByUsername(): ReadonlyArray<Contracts.State.Wallet> {
		for (const wallet of this.blockchainWalletRepository.allByUsername()) {
			if (!super.hasByAddress(wallet.getAddress())) {
				this.#cloneWallet(wallet.getAddress());
			}
		}
		return super.allByUsername();
	}

	#cloneWallet(address: string): Contracts.State.Wallet {
		const clone = this.blockchainWalletRepository.findByAddress(address).clone();
		this.getIndex(Contracts.State.WalletIndexes.Addresses).set(clone.getAddress(), clone);
		return clone;
	}
}
